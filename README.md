# ⚔️ Đấu Trường Toán 6 (Web Toán)

Hệ thống học tập và đấu trường toán học trực tuyến dành cho học sinh **Lớp 6**, được thiết kế theo phong cách RPG phiêu lưu kết hợp đấu trường thời gian thực (Live Quiz). 
Chương trình bám sát 100% chuẩn kiến thức **GDPT 2018** (các bộ sách: *Kết Nối Tri Thức Với Cuộc Sống*, *Cánh Diều*, *Chân Trời Sáng Tạo*).

---

## 🌟 Tính Năng Nổi Bật

### 1. 👥 Cổng Xác Thực & Phân Quyền Hợp Nhất
- **Một cổng đăng nhập duy nhất (`/`)**: Mỗi người dùng tạo tài khoản riêng biệt bằng **Tên đăng nhập (Username)** & **Mật khẩu (Password)**.
- **Lựa chọn vai trò khi đăng ký**:
  - 🎓 **Học sinh**: Tự động khởi tạo hồ sơ nhân vật RPG (Cấp 1, 0 XP, túi đồ tân thủ).
  - 👨‍🏫 **Giáo viên**: Cấp quyền quản trị lớp học, tạo phòng thi đấu và tự soạn đề thi.
- **Bảo mật**: Mật khẩu được mã hóa băm an toàn (`generate_password_hash`).

### 2. 👨‍🏫 Phân Hệ Giáo Viên (Teacher Portal)
- **🎮 Đấu Trường Trực Tiếp (Live Quiz Host - tương tự Kahoot/Quizizz)**:
  - Giáo viên chọn nguồn đề: Từ **8 Chương Toán 6 GDPT 2018** hoặc từ **Bộ đề tự soạn**.
  - Cấu hình số câu hỏi (5 - 20 câu), thời gian mỗi câu (15s - 60s).
  - Sinh **Mã PIN phòng 6 chữ số** và mã QR chiếu lên máy chiếu lớp học.
  - Sảnh chờ (Lobby) hiển thị danh sách học sinh tham gia theo thời gian thực.
  - Màn hình host điều khiển câu hỏi, hiển thị đồng hồ đếm ngược, số lượng bài nộp.
  - Nút **"Hiện Đáp Án & Lời Giải"**: Phương án đúng sáng xanh, hiển thị lời giải chi tiết và **Bảng vàng Top 10 trực tiếp**.
  - Bục vinh danh Top 3 chung cuộc (🥇, 🥈, 🥉).
  - **Cơ chế tự động trao thưởng**: Học sinh thi đấu được cộng điểm kinh nghiệm (XP) và Vàng (Coins) trực tiếp vào tài khoản RPG.
- **✍️ Soạn & Quản Lý Đề Thi Tùy Biến (Custom Quiz Builder)**:
  - Giáo viên có thể tự soạn bộ đề mới.
  - Thêm câu hỏi trắc nghiệm không giới hạn: nhập đề bài, 4 phương án lựa chọn, chọn đáp án đúng và viết **lời giải thích chi tiết từng bước**.
- **📊 Quản Lý & Chẩn Đoán Lớp Học**:
  - Bật/khóa linh hoạt 35 chuyên đề Toán 6 theo tiến độ học trên lớp.
  - Biểu đồ nhiệt (Heatmap) chẩn đoán lỗ hổng kiến thức theo từng mức độ (Dễ, Vừa, Khó).
  - Danh sách học sinh cần lưu ý (Needs attention).
  - Quản lý danh sách học sinh (Roster) và thưởng điểm XP.
- **📺 Màn Hình Trình Chiếu (`/display`)**: Tự động cập nhật bảng vàng thành tích tuần, vinh danh học sinh xuất sắc.

### 3. 🎓 Phân Hệ Học Sinh (Student Portal)
- **🎯 Vào Phòng Thi Đấu Của Lớp**:
  - Nhập mã PIN 6 số của giáo viên để vào sảnh chờ.
  - Thi đấu trực tiếp theo thời gian thực cùng bạn bè trong lớp.
  - Tính điểm theo tốc độ và chuỗi đúng (streak).
  - Xem ngay đáp án và lời giải chi tiết `💡` sau mỗi câu khi hết thời gian.
- **⚔️ Đấu Trường Tự Do RPG Toán 6**:
  - Tự do luyện tập 8 Chương với 35 chuyên đề toán học.
  - Hệ thống 12 cấp bậc RPG, 24 vật phẩm trang bị và hiệu ứng power-up.
  - Cửa hàng trang phục, skin avatar và khung viền mua bằng Vàng kiếm được khi học tập.
  - Hỗ trợ học Toán song ngữ (chuyển đổi linh hoạt 🌐 VI / 🌐 EN).

---

## 📚 Khung Chương Trình Toán Lớp 6 GDPT 2018 (35 Chuyên Đề)

- **Chương 1: Tập Hợp & Số Tự Nhiên** (Tập hợp, Lũy thừa, Chia hết, Số nguyên tố, ƯCLN & BCNN)
- **Chương 2: Số Nguyên** (Số nguyên âm, Thứ tự số nguyên, Cộng trừ nhân chia số nguyên, Ước và bội)
- **Chương 3: Hình Học Trực Quan** (Tam giác đều, Hình vuông, Lục giác đều, Hình chữ nhật, Hình thoi, Hình bình hành, Hình thang cân, Chu vi & Diện tích)
- **Chương 4: Một Số Yếu Tố Thống Kê & Xác Suất** (Thu thập & phân loại dữ liệu, Biểu đồ tranh, Biểu đồ cột, Xác suất thực nghiệm)
- **Chương 5: Phân Số & Số Thập Phân** (Phân số bằng nhau, Phép tính phân số, Số thập phân, Làm tròn & ước lượng, Tỉ số & Tỉ số phần trăm)
- **Chương 6: Hình Học Phẳng** (Điểm và đường thẳng, Ba điểm thẳng hàng, Hai đường thẳng cắt nhau / song song, Tia, Đoạn thẳng & Trung điểm, Góc & Đo góc)
- **Chương 7: Tính Đối Xứng Của Hình Phẳng** (Hình có trục đối xứng, Hình có tâm đối xứng)
- **Chương 8: Ôn Tập Cuối Năm**

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy

### Yêu cầu hệ thống:
- Python 3.8+ (đã tích hợp sẵn trên máy hoặc tải từ python.org).

### Bước 1: Cài đặt thư viện phụ thuộc
```bash
pip install -r requirements.txt
```

### Bước 2: Chạy ứng dụng
```bash
python app.py
```
Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:5001` (hoặc cổng mạng nội bộ hiển thị trên terminal).

### Trên Windows:
Bạn có thể nhấp đúp trực tiếp vào file **`Math Quest.vbs`** để khởi chạy ứng dụng tự động trong nền và mở trình duyệt.

---

## 🛠️ Công Nghệ Sử Dụng
- **Backend**: Python 3, Flask, SQLite3 (chế độ WAL cho tốc độ đọc/ghi đa luồng cực nhanh).
- **Frontend**: HTML5, CSS3 hiện đại, Vanilla JavaScript (Single Page App mượt mà, không giật lag).
- **Mã hóa**: Werkzeug Security (`generate_password_hash`, `check_password_hash`).
- **Kiểm thử**: Fuzz testing tự động với hơn 80.000 câu hỏi bảo đảm tính đúng đắn toán học 100%.
