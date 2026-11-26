import 'dotenv/config';
import { closeStore, initializeStore } from './store.js';

try {
  await initializeStore();
  console.log('Dữ liệu MongoDB Atlas đã sẵn sàng.');
  console.log('Dữ liệu mẫu chỉ được thêm vào collection đang trống.');
} catch (error) {
  console.error('Không thể khởi tạo dữ liệu:', error);
  process.exitCode = 1;
} finally {
  await closeStore();
}
