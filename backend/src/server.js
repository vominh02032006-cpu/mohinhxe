import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import {
  closeStore,
  getCollection,
  initializeStore,
  newId,
  pingStore,
  readStore,
  slugify,
} from './store.js';
import {
  adminCookieName,
  adminSessionMaxAgeSeconds,
  createAdminSession,
  getAdminConfiguration,
  verifyAdminCredentials,
  verifyAdminSession,
} from './admin-auth.js';
import {
  createCustomerSession,
  customerCookieName,
  customerSessionMaxAgeSeconds,
  getSessionSecret,
  hashPassword,
  verifyCustomerSession,
  verifyPassword,
} from './customer-auth.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const collections = {
  categories: { titleField: 'name', fields: ['name', 'slug', 'description', 'image'] },
  products: {
    titleField: 'name',
    fields: ['name', 'slug', 'description', 'price', 'oldPrice', 'image', 'discount', 'sold', 'category'],
  },
  blogs: {
    titleField: 'title',
    fields: ['title', 'slug', 'summary', 'content', 'image', 'category', 'publishedAt'],
  },
  banners: {
    titleField: 'title',
    fields: ['title', 'slug', 'description', 'image', 'link', 'isActive'],
  },
};

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:4200',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

const adminCookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
  path: '/api',
};

function getAdminCookie(req) {
  return getCookie(req, adminCookieName);
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return '';

  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=');
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === name) {
      return cookie.slice(separator + 1).trim();
    }
  }
  return '';
}

function getCustomerCookieOptions() {
  return {
    ...adminCookieOptions,
    maxAge: customerSessionMaxAgeSeconds * 1000,
  };
}

function requireAdmin(req, res, next) {
  if (!getAdminConfiguration()) {
    return res.status(503).json({ message: 'Chưa cấu hình tài khoản admin trên máy chủ.' });
  }
  if (!verifyAdminSession(getAdminCookie(req))) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập admin.' });
  }
  return next();
}

async function requireCustomer(req, res, next) {
  if (!getSessionSecret()) {
    return res.status(503).json({ message: 'Chưa cấu hình SESSION_SECRET trên máy chủ.' });
  }

  const userId = verifyCustomerSession(getCookie(req, customerCookieName));
  if (!userId) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập tài khoản khách hàng.' });
  }

  const user = await getCollection('users').findOne(
    { id: userId },
    { projection: { _id: 0, id: 1, name: 1, email: 1 } },
  );
  if (!user) {
    return res.status(401).json({ message: 'Tài khoản không còn tồn tại.' });
  }

  req.customer = user;
  return next();
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function parseProductPrice(price) {
  const digits = String(price ?? '').replace(/[^\d]/g, '');
  const amount = Number(digits);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : undefined;
}

function sortNewest(items, dateField = 'createdAt') {
  return [...items].sort(
    (left, right) => new Date(right[dateField] || 0).getTime() - new Date(left[dateField] || 0).getTime(),
  );
}

function pickFields(source, fields) {
  const body = source || {};
  return Object.fromEntries(
    fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]),
  );
}

function registerCollectionRoutes(name, config) {
  app.get(`/api/${name}`, async (req, res) => {
    const filter = {};

    if (name === 'products') {
      if (typeof req.query.category === 'string') {
        filter.category = req.query.category;
      }
      if (typeof req.query.search === 'string') {
        const search = req.query.search.trim();
        if (search.length > 100) {
          return res.status(400).json({ message: 'Từ khóa tìm kiếm không được vượt quá 100 ký tự.' });
        }
        if (search) {
          const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          filter.name = { $regex: escapedSearch, $options: 'i' };
        }
      }
    }

    let items = await getCollection(name)
      .find(filter, { projection: { _id: 0 } })
      .toArray();
    if (name === 'products' && req.query.promotion === 'true') {
      items = items.filter((product) => Number(product.discount) > 0);
    }
    return res.json(sortNewest(items));
  });

  app.get(`/api/${name}/:slug`, async (req, res) => {
    const item = await getCollection(name).findOne(
      { slug: req.params.slug },
      { projection: { _id: 0 } },
    );
    if (!item) {
      return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
    }
    return res.json(item);
  });

  app.post(`/api/${name}`, requireAdmin, async (req, res) => {
    const payload = pickFields(req.body, config.fields);
    const sourceTitle = payload[config.titleField];
    const slug = slugify(payload.slug || sourceTitle || '');
    if (!sourceTitle || !slug) {
      return res.status(400).json({ message: `Thiếu trường ${config.titleField}.` });
    }

    const now = new Date().toISOString();
    const item = {
      ...payload,
      id: newId(),
      slug,
      createdAt: now,
      updatedAt: now,
    };
    if (name === 'products') {
      item.discount = Number(item.discount || 0);
      item.sold = Number(item.sold || 0);
    }

    try {
      await getCollection(name).insertOne(item);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: 'Slug đã tồn tại.' });
      }
      throw error;
    }
    return res.status(201).json(item);
  });

  app.put(`/api/${name}/:slug`, requireAdmin, async (req, res) => {
    const payload = pickFields(req.body, config.fields);
    const collection = getCollection(name);
    const existingItem = await collection.findOne(
      { slug: req.params.slug },
      { projection: { _id: 0 } },
    );
    if (!existingItem) {
      return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
    }

    const requestedSlug = payload.slug || (
      payload[config.titleField] ? slugify(payload[config.titleField]) : existingItem.slug
    );
    const updates = { ...payload, slug: requestedSlug, updatedAt: new Date().toISOString() };
    if (name === 'products') {
      const updatedItem = { ...existingItem, ...payload };
      updates.discount = Number(updatedItem.discount || 0);
      updates.sold = Number(updatedItem.sold || 0);
    }

    try {
      const result = await collection.updateOne(
        { slug: req.params.slug },
        { $set: updates },
      );
      if (!result.matchedCount) {
        return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
      }
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: 'Slug đã tồn tại.' });
      }
      throw error;
    }

    const updatedItem = await collection.findOne(
      { slug: requestedSlug },
      { projection: { _id: 0 } },
    );
    if (!updatedItem) {
      return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
    }
    return res.json(updatedItem);
  });

  app.delete(`/api/${name}/:slug`, requireAdmin, async (req, res) => {
    const result = await getCollection(name).deleteOne({ slug: req.params.slug });
    if (!result.deletedCount) {
      return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
    }
    return res.status(204).end();
  });
}

app.get('/api/health', async (_req, res) => {
  await pingStore();
  res.json({ status: 'ok', storage: 'mongodb-atlas' });
});

app.post('/api/admin/login', (req, res) => {
  if (!getAdminConfiguration()) {
    return res.status(503).json({ message: 'Chưa cấu hình tài khoản admin trên máy chủ.' });
  }

  const body = req.body ?? {};
  if (!verifyAdminCredentials(body.username, body.password)) {
    return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
  }

  res.cookie(adminCookieName, createAdminSession(), {
    ...adminCookieOptions,
    maxAge: adminSessionMaxAgeSeconds * 1000,
  });
  return res.json({ authenticated: true });
});

app.get('/api/admin/session', requireAdmin, (_req, res) => {
  return res.json({ authenticated: true, username: process.env.ADMIN_USERNAME });
});

app.post('/api/admin/logout', (_req, res) => {
  res.clearCookie(adminCookieName, adminCookieOptions);
  return res.status(204).end();
});

app.post('/api/auth/register', async (req, res) => {
  if (!getSessionSecret()) {
    return res.status(503).json({ message: 'Chưa cấu hình SESSION_SECRET trên máy chủ.' });
  }

  const body = req.body ?? {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ message: 'Tên phải có từ 2 đến 80 ký tự.' });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Email không hợp lệ.' });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: 'Mật khẩu phải có từ 8 đến 128 ký tự.' });
  }

  const userCollection = getCollection('users');
  if (await userCollection.findOne({ email }, { projection: { _id: 1 } })) {
    return res.status(409).json({ message: 'Email này đã được đăng ký.' });
  }

  const credentials = await hashPassword(password);
  const user = {
    id: newId(),
    name,
    email,
    ...credentials,
    createdAt: new Date().toISOString(),
  };

  try {
    await userCollection.insertOne(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email này đã được đăng ký.' });
    }
    throw error;
  }

  res.cookie(customerCookieName, createCustomerSession(user.id), getCustomerCookieOptions());
  return res.status(201).json({ user: publicUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  if (!getSessionSecret()) {
    return res.status(503).json({ message: 'Chưa cấu hình SESSION_SECRET trên máy chủ.' });
  }

  const body = req.body ?? {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const user = await getCollection('users').findOne({ email });

  if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) {
    return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
  }

  res.cookie(customerCookieName, createCustomerSession(user.id), getCustomerCookieOptions());
  return res.json({ user: publicUser(user) });
});

app.get('/api/auth/me', requireCustomer, (req, res) => {
  return res.json({ user: publicUser(req.customer) });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(customerCookieName, adminCookieOptions);
  return res.status(204).end();
});

app.post('/api/orders', requireCustomer, async (req, res) => {
  const body = req.body ?? {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  const requestedItems = body.items;

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ message: 'Tên người nhận phải có từ 2 đến 80 ký tự.' });
  }
  if (!/^[0-9+()\-\s]{8,20}$/.test(phone)) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ.' });
  }
  if (address.length < 5 || address.length > 300 || note.length > 500) {
    return res.status(400).json({ message: 'Địa chỉ hoặc ghi chú không hợp lệ.' });
  }
  if (!Array.isArray(requestedItems) || requestedItems.length < 1 || requestedItems.length > 50) {
    return res.status(400).json({ message: 'Đơn hàng phải có từ 1 đến 50 sản phẩm.' });
  }

  const quantities = new Map();
  for (const item of requestedItems) {
    if (
      typeof item?.slug !== 'string' ||
      !item.slug ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99 ||
      quantities.has(item.slug)
    ) {
      return res.status(400).json({ message: 'Danh sách sản phẩm hoặc số lượng không hợp lệ.' });
    }
    quantities.set(item.slug, item.quantity);
  }

  const products = await getCollection('products')
    .find({ slug: { $in: [...quantities.keys()] } }, { projection: { _id: 0 } })
    .toArray();
  if (products.length !== quantities.size) {
    return res.status(400).json({ message: 'Một hoặc nhiều sản phẩm không còn tồn tại.' });
  }

  const orderItems = [];
  let total = 0;
  for (const product of products) {
    const unitPrice = parseProductPrice(product.price);
    const quantity = quantities.get(product.slug);
    if (!unitPrice || !quantity) {
      return res.status(400).json({ message: `Giá sản phẩm "${product.name}" không hợp lệ.` });
    }

    const lineTotal = unitPrice * quantity;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(total + lineTotal)) {
      return res.status(400).json({ message: 'Tổng giá trị đơn hàng vượt giới hạn.' });
    }
    total += lineTotal;
    orderItems.push({
      productSlug: product.slug,
      name: product.name,
      image: product.image,
      quantity,
      unitPrice,
      lineTotal,
    });
  }

  const now = new Date().toISOString();
  const order = {
    id: newId(),
    userId: req.customer.id,
    customer: { name, phone, address },
    note,
    items: orderItems,
    total,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  await getCollection('orders').insertOne(order);
  return res.status(201).json(order);
});

app.get('/api/orders/mine', requireCustomer, async (req, res) => {
  const orders = await getCollection('orders')
    .find({ userId: req.customer.id }, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  return res.json(orders);
});

app.get('/api/orders', requireAdmin, async (_req, res) => {
  const orders = await getCollection('orders')
    .find({}, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  return res.json(orders);
});

app.patch('/api/orders/:id/status', requireAdmin, async (req, res) => {
  const statuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
  const status = req.body?.status;
  if (!statuses.includes(status)) {
    return res.status(400).json({ message: 'Trạng thái đơn hàng không hợp lệ.' });
  }

  const result = await getCollection('orders').updateOne(
    { id: req.params.id },
    { $set: { status, updatedAt: new Date().toISOString() } },
  );
  if (!result.matchedCount) {
    return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  }
  const order = await getCollection('orders').findOne(
    { id: req.params.id },
    { projection: { _id: 0 } },
  );
  return res.json(order);
});

app.get('/api/home', async (_req, res) => {
  const store = await readStore();
  const banners = sortNewest(store.banners.filter((banner) => banner.isActive !== false)).slice(0, 3);
  const newProducts = sortNewest(store.products).slice(0, 4);
  const bestSellingProducts = [...store.products]
    .sort((left, right) => Number(right.sold || 0) - Number(left.sold || 0))
    .slice(0, 4);
  const promotionProducts = [...store.products]
    .filter((product) => Number(product.discount) > 0)
    .sort((left, right) => Number(right.discount) - Number(left.discount))
    .slice(0, 4);
  const latestBlogs = sortNewest(store.blogs, 'publishedAt').slice(0, 3);

  res.json({ banners, newProducts, bestSellingProducts, promotionProducts, latestBlogs });
});

for (const [name, config] of Object.entries(collections)) {
  registerCollectionRoutes(name, config);
}

app.use((_req, res) => {
  res.status(404).json({ message: 'API không tồn tại.' });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  return res.status(500).json({ message: 'Lỗi máy chủ khi đọc hoặc ghi dữ liệu.' });
});

await initializeStore();
export default app;

if (process.env.VERCEL !== '1') {
  const server = app.listen(port, () => {
    console.log(`BH Garage API đang chạy tại http://localhost:${port}`);
    console.log(`Dữ liệu được lưu trong MongoDB database "${process.env.MONGODB_DB || 'bhgarage'}".`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server.close(async () => {
        await closeStore();
      });
    });
  }
}
