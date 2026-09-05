// ═══════════════════════════════════════════
// EXPLANATIONS — Giải thích phương pháp giải & Chiến lược tư duy Toán 6
// ═══════════════════════════════════════════
//
// Hiển thị ngay khi học sinh trả lời sai — thời điểm vàng để tiếp thu kiến thức.
// Gồm 2 tầng:
//   1. q.why / q.why_en — Lời giải chi tiết mang chính xác các con số của đề bài (gắn bởi withWhy()).
//   2. STRATEGY[subTopicId] — Mẹo chiến lược cốt lõi của bài học, dùng làm cứu cánh khi câu hỏi chưa có lời giải chi tiết.

// Gắn lời giải chi tiết vào câu hỏi
function withWhy(q, vi, en){
  q.why = vi;
  q.why_vi = vi;
  q.why_en = en || vi;
  return q;
}

// Mẹo chiến lược bám sát chương trình GDPT 2018 Toán lớp 6 (KNTT, Cánh Diều, CTST)
const STRATEGY = {
  // ── Chương 1: Số tự nhiên & Tính chia hết ──
  c1a: {
    vi: 'Tập hợp: Mỗi phần tử chỉ viết 1 lần, phân cách bởi dấu chấm phẩy (;). Số La Mã: I=1, V=5, X=10, L=50, C=100. Chữ số nhỏ đứng trước mang ý nghĩa trừ (IV=4, IX=9, XL=40).',
    en: 'Sets: list elements once separated by semicolons. Roman numerals: I=1, V=5, X=10, L=50, C=100; smaller numeral before larger means subtraction (IV=4, IX=9).'
  },
  c1b: {
    vi: 'Lũy thừa: aⁿ là tích của n thừa số a. Nhân hai luỹ thừa cùng cơ số: aᵐ · aⁿ = aᵐ⁺ⁿ; chia: aᵐ : aⁿ = aᵐ⁻ⁿ (a≠0). Thứ tự: ngoặc tròn () → ngoặc vuông [] → ngoặc nhọn {} → luỹ thừa → nhân, chia → cộng, trừ.',
    en: 'Powers: aⁿ is n factors of a. Multiply same base: aᵐ · aⁿ = aᵐ⁺ⁿ; divide: aᵐ : aⁿ = aᵐ⁻ⁿ. Order of operations: parentheses → powers → multiplication/division → addition/subtraction.'
  },
  c1c: {
    vi: 'Dấu hiệu chia hết: Cho 2 (tận cùng chẵn: 0, 2, 4, 6, 8); Cho 5 (tận cùng 0 hoặc 5); Cho 3 và 9 (khi tổng các chữ số chia hết cho 3 hoặc 9).',
    en: 'Divisibility rules: By 2 (ends in 0,2,4,6,8); By 5 (ends in 0,5); By 3 and 9 (sum of digits divisible by 3 or 9).'
  },
  c1d: {
    vi: 'Số nguyên tố là số tự nhiên lớn hơn 1, chỉ có 2 ước là 1 và chính nó (2, 3, 5, 7, 11, 13, 17, 19...). Hợp số có nhiều hơn 2 ước. Số 2 là số nguyên tố chẵn duy nhất.',
    en: 'Prime numbers are greater than 1 with only two divisors: 1 and itself (2, 3, 5, 7, 11...). 2 is the only even prime.'
  },
  c1e: {
    vi: 'ƯCLN: Chọn thừa số nguyên tố CHUNG với số mũ NHỎ NHẤT. BCNN: Chọn thừa số nguyên tố CHUNG và RIÊNG với số mũ LỚN NHẤT.',
    en: 'GCF: common prime factors with lowest exponent. LCM: common and distinct prime factors with highest exponent.'
  },
  c1z: {
    vi: 'Đọc kỹ đề bài để xác định: cần tính luỹ thừa, xét tính chia hết hay tìm ƯCLN (chia đều đồ vật) hoặc BCNN (chu kỳ gặp lại).',
    en: 'Review the question: decide whether to compute powers, check divisibility, or find GCF/LCM for real-world problems.'
  },

  // ── Chương 2: Số nguyên ──
  c2a: {
    vi: 'Trên trục số nằm ngang: số nguyên âm nằm bên trái số 0, số dương nằm bên phải. Càng về bên trái giá trị càng nhỏ: -9 < -3 < 0 < 5. Số đối của a là -a; số đối của 0 là 0.',
    en: 'On a horizontal number line: negative numbers are to the left of 0, positive to the right. Farther left is smaller: -9 < -3 < 0 < 5. Opposite of a is -a.'
  },
  c2b: {
    vi: 'Cộng cùng dấu: cộng phần số, đặt dấu chung. Cộng khác dấu: lấy số lớn hơn trừ số nhỏ hơn (bỏ dấu), lấy dấu của số có phần số lớn hơn: (-8) + 5 = -3.',
    en: 'Adding same signs: add magnitudes, keep sign. Adding different signs: subtract smaller from larger magnitude, keep sign of larger: (-8) + 5 = -3.'
  },
  c2c: {
    vi: 'Quy tắc dấu ngoặc: Trước ngoặc có dấu "+" giữ nguyên dấu các số hạng bên trong. Trước ngoặc có dấu "-" phải đổi dấu TẤT CẢ các số hạng bên trong: -(a - b + c) = -a + b - c.',
    en: 'Bracket rule: "+" before bracket keeps signs; "-" before bracket flips every sign inside: -(a - b + c) = -a + b - c.'
  },
  c2d: {
    vi: 'Nhân chia số nguyên: Cùng dấu ra DƯƠNG: (+)(+) = (+), (-)(-) = (+). Khác dấu ra ÂM: (+)(-) = (-), (-)(+) = (-).',
    en: 'Multiplication & division: Same signs yield POSITIVE; different signs yield NEGATIVE: (-)(-) = (+), (+)(-) = (-).'
  },
  c2z: {
    vi: 'Khi tính toán số nguyên, hãy xác định DẤU của kết quả trước, sau đó mới tính giá trị độ lớn.',
    en: 'When calculating with integers, determine the sign of the result first, then compute the absolute value.'
  },

  // ── Chương 3: Hình học trực quan & Đối xứng ──
  c3a: {
    vi: 'Tam giác đều có 3 cạnh bằng nhau và 3 góc bằng 60°. Hình vuông có 4 cạnh bằng nhau và 4 góc vuông (90°). Lục giác đều có 6 cạnh bằng nhau và 3 đường chéo chính bằng nhau.',
    en: 'Equilateral triangle has 3 equal sides and 60° angles. Square has 4 equal sides and 4 right angles. Regular hexagon has 6 equal sides and 3 equal main diagonals.'
  },
  c3b: {
    vi: 'Hình chữ nhật: 2 đường chéo bằng nhau. Hình thoi: 4 cạnh bằng nhau, 2 đường chéo vuông góc. Hình bình hành: các cạnh đối song song và bằng nhau. Hình thang cân: 2 cạnh bên bằng nhau, 2 góc kề một đáy bằng nhau.',
    en: 'Rectangle: equal diagonals. Rhombus: 4 equal sides, perpendicular diagonals. Parallelogram: opposite sides parallel and equal. Isosceles trapezoid: equal legs and base angles.'
  },
  c3c: {
    vi: 'Diện tích: Hình chữ nhật = a · b; Hình vuông = a²; Hình bình hành = a · h; Hình thoi = ½ d₁ · d₂; Hình thang = ½(a + b)h.',
    en: 'Area formulas: Rectangle = a · b; Square = a²; Parallelogram = a · h; Rhombus = ½ d₁ · d₂; Trapezoid = ½(a + b)h.'
  },
  c3d: {
    vi: 'Trục đối xứng chia hình thành hai nửa gập chồng khít lên nhau (hình chữ nhật có 2 trục, hình vuông có 4 trục). Tâm đối xứng biến hình thành chính nó khi quay 180° quanh điểm đó.',
    en: 'Axis of symmetry folds the shape onto itself. Center of symmetry maps the figure onto itself under a 180° rotation.'
  },
  c3z: {
    vi: 'Lưu ý kiểm tra và quy đổi về cùng đơn vị đo (ví dụ m ra cm, dm² ra cm²) trước khi tính chu vi và diện tích.',
    en: 'Always convert dimensions to matching units before computing perimeter and area.'
  },

  // ── Chương 4: Phân số ──
  c4a: {
    vi: 'Phân số a/b (a, b ∈ ℤ, b ≠ 0). Hai phân số a/b = c/d khi tích chéo bằng nhau: a · d = b · c.',
    en: 'Fraction a/b with integer numerator and denominator (b≠0). Two fractions a/b = c/d if cross-products match: a · d = b · c.'
  },
  c4b: {
    vi: 'Rút gọn phân số: chia cả tử và mẫu cho ƯCLN để được phân số tối giản. Quy đồng: tìm BCNN của các mẫu số làm mẫu chung.',
    en: 'Simplify: divide numerator and denominator by their GCF. Common denominator: find the LCM of denominators.'
  },
  c4c: {
    vi: 'So sánh phân số: Quy đồng về mẫu số dương chung rồi so sánh tử số (tử lớn hơn thì phân số lớn hơn). Phân số có tử và mẫu cùng dấu thì lớn hơn 0; khác dấu thì nhỏ hơn 0.',
    en: 'Compare fractions: convert to positive common denominator and compare numerators. Same sign numerator/denominator > 0; opposite signs < 0.'
  },
  c4d: {
    vi: 'Cộng trừ phân số khác mẫu: Quy đồng về cùng mẫu số dương rồi cộng (hoặc trừ) các tử số với nhau, giữ nguyên mẫu số chung.',
    en: 'Add/subtract fractions: find common denominator, add/subtract numerators, keep denominator.'
  },
  c4e: {
    vi: 'Nhân phân số: lấy tử nhân tử, mẫu nhân mẫu. Chia phân số: lấy phân số thứ nhất nhân với phân số nghịch đảo của phân số thứ hai: a/b : c/d = a/b · d/c.',
    en: 'Multiply fractions: multiply numerators, multiply denominators. Divide: multiply by reciprocal: a/b : c/d = a/b · d/c.'
  },
  c4f: {
    vi: 'Hai bài toán phân số: (1) Muốn tìm m/n của số a, ta tính a · (m/n). (2) Muốn tìm một số biết m/n của nó bằng b, ta tính b : (m/n).',
    en: 'Two fraction problems: (1) Find m/n of a: compute a · (m/n). (2) Find number whose m/n is b: compute b : (m/n).'
  },
  c4z: {
    vi: 'Luôn rút gọn kết quả phân số về dạng tối giản nhất sau khi hoàn thành phép tính.',
    en: 'Always reduce the final fraction answer to its simplest form.'
  },

  // ── Chương 5: Số thập phân & Tỉ số phần trăm ──
  c5a: {
    vi: 'Số thập phân gồm phần nguyên và phần thập phân ngăn cách bởi dấu phẩy. So sánh phần nguyên trước; nếu bằng nhau thì so sánh hàng phần mười, hàng phần trăm...',
    en: 'Decimals consist of whole and fractional parts. Compare whole parts first, then tenths, hundredths from left to right.'
  },
  c5b: {
    vi: 'Cộng trừ số thập phân: đặt tính sao cho các dấu phẩy thẳng cột. Nhân: nhân như số tự nhiên rồi đếm tổng số chữ số thập phân của hai thừa số để đặt dấu phẩy.',
    en: 'Adding/subtracting decimals: align decimal points. Multiplying: multiply as whole numbers, count total decimal places for the result.'
  },
  c5c: {
    vi: 'Làm tròn số: Nhìn vào chữ số ngay sau hàng làm tròn: nếu < 5 thì giữ nguyên; nếu ≥ 5 thì tăng chữ số hàng làm tròn lên 1 đơn vị.',
    en: 'Rounding rule: if digit to the right is < 5 round down; if ≥ 5 round up by 1.'
  },
  c5d: {
    vi: 'Tỉ số phần trăm: Tỉ số phần trăm của a và b là (a : b) · 100%. Giảm giá x% nghĩa là số tiền phải trả bằng (100 - x)% giá ban đầu.',
    en: 'Percentage: ratio of a and b is (a : b) · 100%. A discount of x% means paying (100 - x)% of the original price.'
  },
  c5z: {
    vi: 'Chú ý yêu cầu đề bài: tính số tiền được giảm hay tính số tiền thực tế khách hàng phải thanh toán.',
    en: 'Read carefully: check whether the question asks for the discount amount or the final price paid.'
  },

  // ── Chương 6: Điểm, Đoạn thẳng & Góc ──
  c6a: {
    vi: 'Qua hai điểm phân biệt có duy nhất 1 đường thẳng. Ba điểm cùng nằm trên 1 đường thẳng gọi là ba điểm thẳng hàng. Hai đường thẳng chỉ có thể: cắt nhau (1 điểm chung), song song (0 điểm chung) hoặc trùng nhau.',
    en: 'Exactly one line passes through two distinct points. Three points on the same line are collinear. Two lines can intersect, be parallel, or coincide.'
  },
  c6b: {
    vi: 'Tia Ox gồm điểm O và phần đường thẳng bị chia ra. Hai tia đối nhau có chung gốc và tạo thành một đường thẳng.',
    en: 'Ray Ox has origin O. Two opposite rays share an origin and form a straight line.'
  },
  c6c: {
    vi: 'Đoạn thẳng AB gồm điểm A, điểm B và tất cả các điểm nằm giữa. M là trung điểm của AB khi M nằm giữa A, B và MA = MB = AB/2.',
    en: 'Segment AB includes endpoints and all points between. M is midpoint if M is between A, B and MA = MB = AB/2.'
  },
  c6d: {
    vi: 'Góc: Góc nhọn (0° < góc < 90°); Góc vuông (= 90°); Góc tù (90° < góc < 180°); Góc bẹt (= 180°).',
    en: 'Angles: Acute (< 90°); Right (= 90°); Obtuse (90° - 180°); Straight (= 180°).'
  },
  c6z: {
    vi: 'Vẽ phác hình hình học ra giấy nháp để xác định chính xác điểm nào nằm giữa hai điểm còn lại.',
    en: 'Sketch a quick diagram to clearly see which point lies between the others.'
  },

  // ── Chương 7: Thống kê & Xác suất ──
  c7a: {
    vi: 'Biểu đồ tranh: Chú ý ghi chú của biểu đồ xem mỗi biểu tượng biểu thị cho bao nhiêu đối tượng.',
    en: 'Pictogram: check the key carefully to see how many items each symbol represents.'
  },
  c7b: {
    vi: 'Biểu đồ cột: chiều cao cột biểu diễn số liệu. Biểu đồ cột kép đặt hai cột cạnh nhau để so sánh hai nhóm đối tượng theo từng tiêu chí.',
    en: 'Bar charts: height represents value. Double bar charts place two bars side by side to compare two groups across categories.'
  },
  c7c: {
    vi: 'Gieo xúc xắc 6 mặt có 6 kết quả có thể: {1, 2, 3, 4, 5, 6}. Tung đồng xu có 2 kết quả có thể: {Sấp, Ngửa}.',
    en: 'Rolling a 6-sided die has 6 outcomes: {1,2,3,4,5,6}. Flipping a coin has 2 outcomes: {Heads, Tails}.'
  },
  c7d: {
    vi: 'Xác suất thực nghiệm của sự kiện A = (Số lần sự kiện A xảy ra) : (Tổng số lần thực hiện thí nghiệm).',
    en: 'Experimental probability = (Number of successful occurrences) / (Total number of trials).'
  },
  c7z: {
    vi: 'Đếm chính xác tổng số lần thử nghiệm trước khi tính tỉ số xác suất thực nghiệm.',
    en: 'Count total trials accurately before calculating experimental probability ratio.'
  },

  // ── Chương 8: Đấu trường tổng hợp ──
  c8a: {
    vi: 'Đấu trường tổng hợp: Nhận diện mạch kiến thức (Số tự nhiên, Số nguyên, Hình học, Phân số hay Thống kê) rồi áp dụng đúng phương pháp giải.',
    en: 'Comprehensive review: identify the topic category and apply the corresponding math strategy.'
  },
};

function explanationFor(q, lang){
  if(q && q.why) {
    if(lang === 'en') return q.why_en || q.why;
    if(lang === 'vi') return q.why_vi || q.why;
    return q.why_es || q.why_vi || q.why;
  }
  const unit  = String((q && q._unit) || '');
  const strat = STRATEGY[unit]                          // sub-topic cụ thể (ví dụ c2c)
             || STRATEGY[unit.replace(/[a-z]$/, 'z')]   // sub-topic ôn tập của chương (c2c -> c2z)
             || STRATEGY[unit + 'z'];                   // chương cha (c2 -> c2z)
  if(!strat) return '';
  if(lang === 'en') return strat.en || strat.vi;
  if(lang === 'vi') return strat.vi || strat.en;
  return strat.es || strat.vi || strat.en;
}
