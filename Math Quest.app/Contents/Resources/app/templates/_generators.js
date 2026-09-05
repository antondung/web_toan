// MATH HELPERS
// ═══════════════════════════════════════════
const rand  = (lo,hi) => Math.floor(Math.random()*(hi-lo+1))+lo;
const pick  = a => a[Math.floor(Math.random()*a.length)];
const gcd   = (a,b) => b===0?a:gcd(b,a%b);
const lcm   = (a,b) => a*b/gcd(a,b);
const red   = (n,d) => { const g=gcd(Math.abs(n),Math.abs(d)); return [n/g,d/g]; };
const fstr  = (n,d) => d===1?`${n}`:`${n}/${d}`;
const shuf  = a => { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=rand(0,i);[b[i],b[j]]=[b[j],b[i]];} return b; };
const uniq4 = arr => { const s=new Set(),o=[]; for(const v of arr){if(!s.has(String(v))){s.add(String(v));o.push(String(v));} if(o.length===4)break;} return o; };

function mk(question, answer, wrongs){
  const choices=uniq4(shuf([String(answer),...wrongs.filter(w=>String(w)!==String(answer))]));
  if(!choices.includes(String(answer))) choices[0]=String(answer);
  return {question, answer:String(answer), choices:shuf(choices)};
}

function mkB(vi, en, answer, wrongs){
  const choices=uniq4(shuf([String(answer),...wrongs.filter(w=>String(w)!==String(answer))]));
  if(!choices.includes(String(answer))) choices[0]=String(answer);
  return {vi, en: en || vi, question: vi, answer:String(answer), choices:shuf(choices)};
}

// mkQ attaches a dedicated, worked step-by-step explanation to the question
function mkQ(vi, en, answer, wrongs, whyVi, whyEn){
  const q = mkB(vi, en, answer, wrongs);
  return withWhy(q, whyVi, whyEn || whyVi);
}

const CMAS_DOMAINS = {
  SH:'Số học & Đại số',
  HH:'Hình học & Đo lường',
  TK:'Thống kê & Xác suất',
};

function mkMS(vi,en,answers,allChoices,domain){
  const ans     = [...new Set(answers.map(String))];
  const choices = [...new Set(allChoices.map(String))];
  for(const a of ans) if(!choices.includes(a)) choices.push(a);
  return {vi,en:en||vi,question:vi,type:'ms',domain,answers:ans,choices:shuf(choices)};
}

function mkSA(vi,en,answer,domain){
  return {vi,en:en||vi,question:vi,type:'sa',domain,answer:String(answer)};
}

function normNum(s){
  s=String(s).trim().replace(/,/g,'').replace(/\s/g,'');
  if(s.endsWith('%')) return parseFloat(s)/100;
  const m=s.match(/^(-?\d+)\/(-?\d+)$/);
  if(m){const d=parseInt(m[2]);return d?parseInt(m[1])/d:NaN;}
  return parseFloat(s);
}
function numEq(a,b){
  const na=normNum(a),nb=normNum(b);
  return !isNaN(na)&&!isNaN(nb)&&Math.abs(na-nb)<1e-9;
}

function shufParallel(...arrays){
  const len=arrays[0].length;
  const idx=Array.from({length:len},(_,i)=>i);
  for(let i=len-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
  return arrays.map(a=>idx.map(i=>a[i]));
}

function twoDistinct(lo,hi){
  const a=rand(lo,hi);
  let   b=rand(lo,hi-1);
  if(b>=a) b++;
  return [a,b];
}

function nearWrongs(ans,count=3,spread=5){
  const dp    = (String(ans).split('.')[1] || '').length;
  const round = v => dp ? +v.toFixed(dp) : v;
  const s=new Set(); let t=0;
  while(s.size<count&&t++<60){
    const d=rand(1,spread)*(Math.random()<.5?1:-1);
    const w=round(+ans+d);
    if(w!==+ans) s.add(w);
  }
  for(let k=1; s.size<count; k++) s.add(round(+ans+spread+k));
  return [...s].map(String);
}

// ═══════════════════════════════════════════
// CHƯƠNG 1: SỐ TỰ NHIÊN & TÍNH CHIA HẾT (c1)
// ═══════════════════════════════════════════

// c1a: Tập hợp, phần tử & Số La Mã
const ROMAN_MAP = [[1,'I'],[2,'II'],[3,'III'],[4,'IV'],[5,'V'],[6,'VI'],[7,'VII'],[8,'VIII'],[9,'IX'],[10,'X'],
  [11,'XI'],[12,'XII'],[14,'XIV'],[15,'XV'],[16,'XVI'],[19,'XIX'],[20,'XX'],[24,'XXIV'],[26,'XXVI'],[29,'XXIX'],[30,'XXX']];

function c1aEasy(){
  if(rand(0,1)===0){
    const item = pick(ROMAN_MAP);
    const ans = item[1];
    const wrongs = ROMAN_MAP.filter(x => x[1] !== ans).slice(0, 3).map(x => x[1]);
    return mkQ(`Số La Mã nào sau đây biểu diễn số tự nhiên ${item[0]}?`,
               `Which Roman numeral represents ${item[0]}?`,
               ans, wrongs,
               `Đáp án đúng là ${ans}. Trong hệ chữ số La Mã, số ${item[0]} được viết là ${ans}.`,
               `The correct answer is ${ans}. Roman numeral for ${item[0]} is ${ans}.`);
  }
  const a = rand(1, 4), b = rand(5, 8), c = rand(9, 12);
  const inside = pick([a, b, c]);
  const ans = `${inside} ∈ A`;
  return mkQ(`Cho tập hợp A = {${a}; ${b}; ${c}}. Khẳng định nào sau đây là ĐÚNG?`,
             `Given set A = {${a}, ${b}, ${c}}. Which statement is TRUE?`,
             ans, [`${inside} ∉ A`, `${inside + 1} ∈ A`, `${inside + 2} ∈ A`],
             `Đáp án đúng là ${ans}. Vì phần tử ${inside} thuộc tập hợp A nên kí hiệu đúng là ${inside} ∈ A.`,
             `The correct answer is ${ans}. Since ${inside} is an element of A, ${inside} ∈ A.`);
}

function c1aMedium(){
  if(rand(0,1)===0){
    const lo = rand(2, 5), hi = rand(15, 30);
    const count = hi - lo + 1;
    return mkQ(`Tập hợp B = {x ∈ ℕ | ${lo} ≤ x ≤ ${hi}} có bao nhiêu phần tử?`,
               `How many elements are in the set B = {x ∈ ℕ | ${lo} ≤ x ≤ ${hi}}?`,
               `${count}`, [`${count - 1}`, `${count + 1}`, `${hi - lo}`],
               `Đáp án đúng là ${count}. Số phần tử của tập hợp là: ${hi} - ${lo} + 1 = ${count} phần tử.`,
               `The correct answer is ${count}. Count: ${hi - lo} + 1 = ${count}.`);
  }
  const item = pick(ROMAN_MAP.slice(10));
  return mkQ(`Số La Mã ${item[1]} có giá trị trong hệ thập phân là bao nhiêu?`,
             `What is the decimal value of Roman numeral ${item[1]}?`,
             `${item[0]}`, [`${item[0] - 1}`, `${item[0] + 1}`, `${item[0] + 2}`],
             `Đáp án đúng là ${item[0]}. Chữ số La Mã ${item[1]} tương ứng với số tự nhiên ${item[0]}.`,
             `The correct answer is ${item[0]}. Roman numeral ${item[1]} equals ${item[0]}.`);
}

function c1aHard(){
  const start = rand(2, 6), step = rand(2, 4), n = rand(10, 20);
  const end = start + (n - 1) * step;
  return mkQ(`Tập hợp C gồm các số cách đều: {${start}; ${start + step}; ${start + 2*step}; ...; ${end}}. Hỏi tập hợp C có bao nhiêu phần tử?`,
             `Set C has elements: {${start}, ${start + step}, ... ${end}}. How many elements are in C?`,
             `${n}`, [`${n - 1}`, `${n + 1}`, `${n + 2}`],
             `Đáp án đúng là ${n}. Công thức tính số phần tử dãy cách đều: (Số cuối - Số đầu) : khoảng cách + 1 = (${end} - ${start}) : ${step} + 1 = ${n} phần tử.`,
             `The correct answer is ${n}. Total elements = ${n}.`);
}

// c1b: Lũy thừa & Thứ tự thực hiện phép tính
function c1bEasy(){
  if(rand(0,1)===0){
    const b = rand(2, 5), p = rand(2, 4);
    const ans = Math.pow(b, p);
    return mkQ(`Giá trị của lũy thừa ${b}^${p} (${b} mũ ${p}) là bao nhiêu?`,
               `What is the value of ${b}^${p}?`,
               `${ans}`, [`${b * p}`, `${ans + b}`, `${ans - 1}`],
               `Đáp án đúng là ${ans}. Ta có ${b}^${p} nghĩa là tích của ${p} thừa số ${b}, kết quả bằng ${ans}.`,
               `The correct answer is ${ans}. ${b}^${p} = ${ans}.`);
  }
  const b = rand(2, 6), m = rand(2, 4), n = rand(2, 5);
  return mkQ(`Viết tích ${b}^${m} · ${b}^${n} dưới dạng một lũy thừa:`,
             `Write ${b}^${m} · ${b}^${n} as a single power:`,
             `${b}^${m + n}`, [`${b}^${m * n}`, `${b * b}^${m + n}`, `${b}^${m + n + 1}`],
             `Đáp án đúng là ${b}^${m + n}. Khi nhân hai lũy thừa cùng cơ số, giữ nguyên cơ số và cộng số mũ: ${b}^${m} · ${b}^${n} = ${b}^(${m}+${n}) = ${b}^${m + n}.`,
             `The correct answer is ${b}^${m + n}. Add exponents: ${b}^${m} · ${b}^${n} = ${b}^${m + n}.`);
}

function c1bMedium(){
  if(rand(0,1)===0){
    const b = rand(2, 7), m = rand(5, 9), n = rand(2, 4);
    return mkQ(`Viết thương ${b}^${m} : ${b}^${n} dưới dạng một lũy thừa:`,
               `Write ${b}^${m} : ${b}^${n} as a single power:`,
               `${b}^${m - n}`, [`${b}^${m + n}`, `${b}^${Math.floor(m / n)}`, `${b}^${m - n + 1}`],
               `Đáp án đúng là ${b}^${m - n}. Khi chia hai lũy thừa cùng cơ số, giữ nguyên cơ số và trừ số mũ: ${b}^${m} : ${b}^${n} = ${b}^(${m}-${n}) = ${b}^${m - n}.`,
               `The correct answer is ${b}^${m - n}. Subtract exponents: ${b}^${m} : ${b}^${n} = ${b}^${m - n}.`);
  }
  const a = rand(10, 30), b = rand(2, 5), c = rand(2, 4);
  const ans = a + b * (c * c);
  return mkQ(`Tính giá trị biểu thức: ${a} + ${b} · ${c}²`,
             `Calculate: ${a} + ${b} · ${c}²`,
             `${ans}`, [`${(a + b) * (c * c)}`, `${a + b * c * 2}`, `${ans + 5}`],
             `Đáp án đúng là ${ans}. Thứ tự: tính lũy thừa ${c}² = ${c*c} trước, rồi nhân ${b} · ${c*c} = ${b*c*c}, cuối cùng cộng: ${a} + ${b*c*c} = ${ans}.`,
             `The correct answer is ${ans}. Exponent first: ${c}² = ${c*c}, multiply: ${b} · ${c*c} = ${b*c*c}, then add: ${a} + ${b*c*c} = ${ans}.`);
}

function c1bHard(){
  const a = rand(2, 5), x = rand(2, 5);
  const prod = Math.pow(a, x) * Math.pow(a, 2);
  return mkQ(`Tìm số tự nhiên x biết: ${a}^x · ${a}² = ${prod}`,
             `Find natural number x such that: ${a}^x · ${a}² = ${prod}`,
             `${x}`, [`${x + 1}`, `${x + 2}`, `${x - 1 || 6}`],
             `Đáp án đúng là ${x}. Ta có ${a}^(x+2) = ${prod} = ${a}^${x+2}, do đó x + 2 = ${x+2} suy ra x = ${x}.`,
             `The correct answer is ${x}. Since ${a}^(x+2) = ${prod}, we have x = ${x}.`);
}

// c1c: Tính chất chia hết, dấu hiệu chia hết (2, 3, 5, 9)
function c1cEasy(){
  if(rand(0,1)===0){
    const ev = rand(10, 50) * 2;
    const od1 = rand(10, 50) * 2 + 1, od2 = od1 + 2, od3 = od1 + 4;
    return mkQ(`Số nào sau đây chia hết cho 2?`,
               `Which of the following numbers is divisible by 2?`,
               `${ev}`, [`${od1}`, `${od2}`, `${od3}`],
               `Đáp án đúng là ${ev}. Vì số ${ev} có chữ số tận cùng là ${ev % 10} (chữ số chẵn) nên ${ev} chia hết cho 2.`,
               `The correct answer is ${ev}. It ends in ${ev % 10}, so ${ev} is divisible by 2.`);
  }
  const div5 = rand(5, 30) * 5;
  const non1 = div5 + 1, non2 = div5 + 2, non3 = div5 + 3;
  return mkQ(`Số nào sau đây chia hết cho 5?`,
             `Which of the following numbers is divisible by 5?`,
             `${div5}`, [`${non1}`, `${non2}`, `${non3}`],
             `Đáp án đúng là ${div5}. Vì số ${div5} có chữ số tận cùng là ${div5 % 10} (tận cùng là 0 hoặc 5) nên chia hết cho 5.`,
             `The correct answer is ${div5}. It ends in ${div5 % 10}, so ${div5} is divisible by 5.`);
}

function c1cMedium(){
  if(rand(0,1)===0){
    const mul3 = rand(15, 60) * 3;
    const n1 = mul3 + 1, n2 = mul3 + 2, n3 = mul3 + 4;
    const sumD = String(mul3).split('').reduce((s, d) => s + parseInt(d), 0);
    return mkQ(`Số nào sau đây chia hết cho 3?`,
               `Which of the following numbers is divisible by 3?`,
               `${mul3}`, [`${n1}`, `${n2}`, `${n3}`],
               `Đáp án đúng là ${mul3}. Tổng các chữ số của ${mul3} là ${sumD} chia hết cho 3 nên số ${mul3} chia hết cho 3.`,
               `The correct answer is ${mul3}. Sum of digits is ${sumD}, which is divisible by 3.`);
  }
  const mul9 = rand(10, 40) * 9;
  const n1 = mul9 + 2, n2 = mul9 + 3, n3 = mul9 + 5;
  const sumD = String(mul9).split('').reduce((s, d) => s + parseInt(d), 0);
  return mkQ(`Số nào sau đây chia hết cho 9?`,
             `Which of the following numbers is divisible by 9?`,
             `${mul9}`, [`${n1}`, `${n2}`, `${n3}`],
             `Đáp án đúng là ${mul9}. Tổng các chữ số của ${mul9} là ${sumD} chia hết cho 9 nên số ${mul9} chia hết cho 9.`,
             `The correct answer is ${mul9}. Sum of digits is ${sumD}, which is divisible by 9.`);
}

function c1cHard(){
  const divBoth = rand(5, 25) * 10;
  return mkQ(`Số nào sau đây chia hết cho cả 2 và 5?`,
             `Which number is divisible by both 2 and 5?`,
             `${divBoth}`, [`${divBoth + 2}`, `${divBoth + 5}`, `${divBoth + 3}`],
             `Đáp án đúng là ${divBoth}. Số chia hết cho cả 2 và 5 phải có chữ số tận cùng là 0. Số ${divBoth} thỏa mãn.`,
             `The correct answer is ${divBoth}. Numbers divisible by both 2 and 5 end in 0: ${divBoth}.`);
}

// c1d: Số nguyên tố, hợp số & Phân tích thừa số nguyên tố
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
const COMPOSITES = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 25, 27];

function c1dEasy(){
  const p = pick(PRIMES.slice(0, 8));
  const c1 = pick(COMPOSITES), c2 = pick(COMPOSITES.filter(x => x !== c1)), c3 = pick(COMPOSITES.filter(x => x !== c1 && x !== c2));
  return mkQ(`Số nào sau đây là số nguyên tố?`,
             `Which of the following is a prime number?`,
             `${p}`, [`${c1}`, `${c2}`, `${c3}`],
             `Đáp án đúng là ${p}. Số nguyên tố là số tự nhiên lớn hơn 1, chỉ có 2 ước là 1 và chính nó. Số ${p} là số nguyên tố.`,
             `The correct answer is ${p}. Prime numbers have only 2 factors (1 and itself). ${p} is prime.`);
}

function c1dMedium(){
  const cases = [
    [12, '2² · 3', ['2 · 3²', '2³ · 3', '4 · 3']],
    [18, '2 · 3²', ['2² · 3', '2 · 9', '2² · 3²']],
    [20, '2² · 5', ['2 · 5²', '4 · 5', '2³ · 5']],
    [24, '2³ · 3', ['2² · 3²', '2 · 12', '2⁴ · 3']],
    [36, '2² · 3²', ['2³ · 3', '4 · 9', '2 · 3³']],
    [45, '3² · 5', ['3 · 5²', '9 · 5', '3³ · 5']],
    [50, '2 · 5²', ['2² · 5', '2 · 25', '2² · 5²']]
  ];
  const item = pick(cases);
  return mkQ(`Phân tích số ${item[0]} ra thừa số nguyên tố ta được kết quả là:`,
             `Prime factorization of ${item[0]} is:`,
             item[1], item[2],
             `Đáp án đúng là ${item[1]}. Phân tích ${item[0]} ra thừa số nguyên tố ta được ${item[1]}.`,
             `The correct answer is ${item[1]}. Prime factorization of ${item[0]} is ${item[1]}.`);
}

function c1dHard(){
  return mkQ(`Khẳng định nào sau đây về số nguyên tố là ĐÚNG?`,
             `Which statement about prime numbers is TRUE?`,
             `Số 2 là số nguyên tố chẵn duy nhất`,
             [`Mọi số nguyên tố đều là số lẻ`, `Số 1 là số nguyên tố nhỏ nhất`, `Mọi số chẵn đều là hợp số`],
             `Đáp án đúng là "Số 2 là số nguyên tố chẵn duy nhất". Tất cả các số chẵn lớn hơn 2 đều chia hết cho 2 nên đều là hợp số.`,
             `The correct answer is "Số 2 là số nguyên tố chẵn duy nhất". 2 is the only even prime number.`);
}

// c1e: ƯCLN, BCNN & Bài toán thực tế
function c1eEasy(){
  const pairs = [[12, 18, 6], [8, 12, 4], [15, 20, 5], [14, 21, 7], [16, 24, 8], [9, 15, 3]];
  const [a, b, ans] = pick(pairs);
  return mkQ(`Ước chung lớn nhất ƯCLN(${a}, ${b}) là:`,
             `Greatest Common Factor GCF(${a}, ${b}) is:`,
             `${ans}`, [`${ans * 2}`, `${ans === 2 ? 1 : 2}`, `${ans + 1}`],
             `Đáp án đúng là ${ans}. Vì ${ans} là số lớn nhất mà cả ${a} và ${b} đều chia hết, nên ƯCLN(${a}, ${b}) = ${ans}.`,
             `The correct answer is ${ans}. GCF(${a}, ${b}) = ${ans}.`);
}

function c1eMedium(){
  const pairs = [[4, 6, 12], [6, 8, 24], [6, 9, 18], [10, 15, 30], [8, 12, 24], [12, 15, 60]];
  const [a, b, ans] = pick(pairs);
  return mkQ(`Bội chung nhỏ nhất BCNN(${a}, ${b}) là:`,
             `Least Common Multiple LCM(${a}, ${b}) is:`,
             `${ans}`, [`${a * b}`, `${ans / 2}`, `${ans + a}`],
             `Đáp án đúng là ${ans}. Vì ${ans} là số tự nhiên nhỏ nhất khác 0 cùng chia hết cho cả ${a} và ${b}, nên BCNN(${a}, ${b}) = ${ans}.`,
             `The correct answer is ${ans}. LCM(${a}, ${b}) = ${ans}.`);
}

function c1eHard(){
  const pairs = [[18, 24, 6], [20, 30, 10], [24, 36, 12], [16, 24, 8]];
  const [but, vo, ans] = pick(pairs);
  return mkQ(`Cô giáo muốn chia đều ${but} chiếc bút bi và ${vo} quyển vở vào các túi quà. Hỏi cô có thể chia được nhiều nhất bao nhiêu túi quà?`,
             `A teacher wants to divide ${but} pens and ${vo} notebooks equally into gift bags. What is the greatest number of gift bags she can make?`,
             `${ans} túi quà`, [`${ans + 2} túi quà`, `${ans * 2} túi quà`, `${ans - 2 || 4} túi quà`],
             `Đáp án đúng là ${ans} túi quà. Số túi quà chia được nhiều nhất chính là ước chung lớn nhất ƯCLN(${but}, ${vo}) = ${ans} túi quà.`,
             `The correct answer is ${ans} túi quà. Maximum bags is GCF(${but}, ${vo}) = ${ans}.`);
}

// c1z: Luyện tập tổng hợp số tự nhiên
function c1zEasy(){ return c1aEasy(); }
function c1zMedium(){ return c1bMedium(); }
function c1zHard(){ return c1eHard(); }


// ═══════════════════════════════════════════
// CHƯƠNG 2: SỐ NGUYÊN (c2)
// ═══════════════════════════════════════════

// c2a: Số nguyên âm, tập hợp ℤ, trục số & so sánh
function c2aEasy(){
  const n = rand(2, 25);
  return mkQ(`Số đối của số nguyên ${n} là:`,
             `What is the opposite of ${n}?`,
             `-${n}`, [`${n}`, `${n + 1}`, `0`],
             `Đáp án đúng là -${n}. Hai số đối nhau có tổng bằng 0, số đối của ${n} là -${n}.`,
             `The correct answer is -${n}. Opposite of ${n} is -${n}.`);
}

function c2aMedium(){
  const [a, b] = twoDistinct(2, 30);
  const smaller = a > b ? -a : -b;
  const larger = a > b ? -b : -a;
  return mkQ(`So sánh hai số nguyên -${a} và -${b}: khẳng định nào sau đây là ĐÚNG?`,
             `Compare integers -${a} and -${b}: which statement is TRUE?`,
             `${smaller} < ${larger}`,
             [`${smaller} > ${larger}`, `${smaller} = ${larger}`, `-${a} > 0`],
             `Đáp án đúng là ${smaller} < ${larger}. Trong hai số nguyên âm, số nào có khoảng cách tới 0 lớn hơn thì số đó nhỏ hơn: ${smaller} < ${larger}.`,
             `The correct answer is ${smaller} < ${larger}. Further left on the number line is smaller.`);
}

function c2aHard(){
  return mkQ(`Sắp xếp các số nguyên sau theo thứ tự tăng dần: 5; -9; 0; -4; 8`,
             `Sort integers in increasing order: 5, -9, 0, -4, 8`,
             `-9; -4; 0; 5; 8`,
             [`-4; -9; 0; 5; 8`, `8; 5; 0; -4; -9`, `-9; 0; -4; 5; 8`],
             `Đáp án đúng là -9; -4; 0; 5; 8. Số nguyên âm nhỏ hơn 0, số nguyên dương lớn hơn 0; ta có -9 < -4 < 0 < 5 < 8.`,
             `The correct answer is -9; -4; 0; 5; 8. Negative integers < 0 < positive integers.`);
}

// c2b: Phép cộng & trừ hai số nguyên
function c2bEasy(){
  const a = rand(2, 15), b = rand(2, 15);
  const ans = -a + (-b);
  return mkQ(`Tính: (-${a}) + (-${b})`,
             `Calculate: (-${a}) + (-${b})`,
             `${ans}`, [`${a + b}`, `${-Math.abs(a - b)}`, `${ans - 2}`],
             `Đáp án đúng là ${ans}. Muốn cộng hai số nguyên âm, ta cộng phần số tự nhiên rồi đặt dấu trừ trước kết quả: (-${a}) + (-${b}) = -(${a} + ${b}) = ${ans}.`,
             `The correct answer is ${ans}. (-${a}) + (-${b}) = -(${a} + ${b}) = ${ans}.`);
}

function c2bMedium(){
  const a = rand(10, 30), b = rand(2, 9);
  const ans = -a + b;
  return mkQ(`Tính: (-${a}) + ${b}`,
             `Calculate: (-${a}) + ${b}`,
             `${ans}`, [`${-(a + b)}`, `${a - b}`, `${ans - 2}`],
             `Đáp án đúng là ${ans}. Cộng hai số nguyên khác dấu: lấy số có phần độ lớn lớn hơn trừ đi phần nhỏ hơn rồi lấy dấu của nó: (-${a}) + ${b} = -(${a} - ${b}) = ${ans}.`,
             `The correct answer is ${ans}. (-${a}) + ${b} = ${ans}.`);
}

function c2bHard(){
  const a = rand(5, 20), b = rand(10, 30);
  const ans = a - b;
  return mkQ(`Tính: ${a} - ${b}`,
             `Calculate: ${a} - ${b}`,
             `${ans}`, [`${b - a}`, `${-(a + b)}`, `${ans - 3}`],
             `Đáp án đúng là ${ans}. Muốn trừ số nguyên a cho b, ta lấy a cộng với số đối của b: ${a} - ${b} = ${a} + (-${b}) = ${ans}.`,
             `The correct answer is ${ans}. ${a} - ${b} = ${ans}.`);
}

// c2c: Quy tắc dấu ngoặc & tính nhanh
function c2cEasy(){
  return mkQ(`Bỏ dấu ngoặc của biểu thức -(a - b + c) ta được kết quả là:`,
             `Expand the brackets: -(a - b + c) = ?`,
             `-a + b - c`,
             [`-a - b + c`, `-a - b - c`, `a - b + c`],
             `Đáp án đúng là -a + b - c. Khi bỏ dấu ngoặc có dấu trừ đằng trước, ta phải đổi dấu tất cả các số hạng trong ngoặc: +a thành -a, -b thành +b, +c thành -c.`,
             `The correct answer is -a + b - c. A negative sign before parentheses flips every sign inside.`);
}

function c2cMedium(){
  const a = rand(20, 80), b = rand(10, 30);
  const ans = b + 5;
  return mkQ(`Tính nhanh giá trị biểu thức: (${a} + ${b}) - (${a} - 5)`,
             `Quickly evaluate: (${a} + ${b}) - (${a} - 5)`,
             `${ans}`, [`${b - 5}`, `${ans + 10}`, `${2 * a + b}`],
             `Đáp án đúng là ${ans}. Bỏ ngoặc: ${a} + ${b} - ${a} + 5 = (${a} - ${a}) + ${b} + 5 = 0 + ${b} + 5 = ${ans}.`,
             `The correct answer is ${ans}. ${a} cancels with -${a}, leaving ${b} + 5 = ${ans}.`);
}

function c2cHard(){
  const n = rand(15, 65);
  return mkQ(`Tính giá trị biểu thức: (125 - ${n}) - (125 - ${n} + 40)`,
             `Calculate: (125 - ${n}) - (125 - ${n} + 40)`,
             `-40`, [`40`, `0`, `-80`],
             `Đáp án đúng là -40. Bỏ ngoặc: 125 - ${n} - 125 + ${n} - 40 = (125 - 125) + (-${n} + ${n}) - 40 = 0 + 0 - 40 = -40.`,
             `The correct answer is -40. All leading terms cancel out, leaving -40.`);
}

// c2d: Phép nhân, chia số nguyên & ước bội
function c2dEasy(){
  const a = rand(2, 9), b = rand(2, 9);
  const ans = -a * b;
  return mkQ(`Tính: (-${a}) · ${b}`,
             `Calculate: (-${a}) · ${b}`,
             `${ans}`, [`${a * b}`, `${ans - a}`, `${ans + b}`],
             `Đáp án đúng là ${ans}. Tích hai số nguyên khác dấu luôn mang dấu âm: (-${a}) · ${b} = -(${a} · ${b}) = ${ans}.`,
             `The correct answer is ${ans}. Negative times positive is negative: ${ans}.`);
}

function c2dMedium(){
  const a = rand(2, 9), b = rand(2, 9);
  const ans = a * b;
  return mkQ(`Tính: (-${a}) · (-${b})`,
             `Calculate: (-${a}) · (-${b})`,
             `${ans}`, [`${-ans}`, `${ans + 2}`, `${-ans - 2}`],
             `Đáp án đúng là ${ans}. Tích hai số nguyên cùng dấu luôn mang dấu dương: (-${a}) · (-${b}) = ${a} · ${b} = ${ans}.`,
             `The correct answer is ${ans}. Negative times negative is positive: ${ans}.`);
}

function c2dHard(){
  const q = rand(3, 9), b = rand(2, 8);
  const a = q * b;
  const ans = -q;
  return mkQ(`Tính: (-${a}) : ${b}`,
             `Calculate: (-${a}) : ${b}`,
             `${ans}`, [`${q}`, `${ans - 2}`, `${q + 1}`],
             `Đáp án đúng là ${ans}. Thương của hai số nguyên khác dấu luôn mang dấu âm: (-${a}) : ${b} = -(${a} : ${b}) = ${ans}.`,
             `The correct answer is ${ans}. Negative divided by positive is negative: ${ans}.`);
}

// c2z: Luyện tập tổng hợp số nguyên
function c2zEasy(){ return c2aEasy(); }
function c2zMedium(){ return c2bMedium(); }
function c2zHard(){ return c2dHard(); }


// ═══════════════════════════════════════════
// CHƯƠNG 3: HÌNH HỌC TRỰC QUAN & ĐỐI XỨNG (c3)
// ═══════════════════════════════════════════

// c3a: Tam giác đều, hình vuông, lục giác đều
function c3aEasy(){
  const a = rand(3, 15);
  return mkQ(`Một tam giác đều có cạnh bằng ${a} cm. Chu vi của tam giác đều đó là:`,
             `An equilateral triangle has side ${a} cm. Its perimeter is:`,
             `${3 * a} cm`, [`${4 * a} cm`, `${2 * a} cm`, `${a * a} cm`],
             `Đáp án đúng là ${3 * a} cm. Tam giác đều có 3 cạnh bằng nhau, chu vi bằng 3 · cạnh = 3 · ${a} = ${3 * a} cm.`,
             `The correct answer is ${3 * a} cm. Perimeter = 3 × ${a} = ${3 * a} cm.`);
}

function c3aMedium(){
  const a = rand(4, 16);
  return mkQ(`Một hình vuông có chu vi là ${4 * a} cm. Diện tích của hình vuông đó là:`,
             `A square has perimeter ${4 * a} cm. Its area is:`,
             `${a * a} cm²`, [`${4 * a} cm²`, `${2 * a * a} cm²`, `${(a + 2) * (a + 2)} cm²`],
             `Đáp án đúng là ${a * a} cm². Cạnh hình vuông bằng ${4 * a} : 4 = ${a} cm. Diện tích bằng cạnh nhân cạnh: ${a} · ${a} = ${a * a} cm².`,
             `The correct answer is ${a * a} cm². Side is ${4 * a} / 4 = ${a} cm, area is ${a} × ${a} = ${a * a} cm².`);
}

function c3aHard(){
  return mkQ(`Một hình lục giác đều có bao nhiêu đường chéo chính?`,
             `How many main diagonals does a regular hexagon have?`,
             `3 đường chéo chính`,
             [`6 đường chéo chính`, `4 đường chéo chính`, `2 đường chéo chính`],
             `Đáp án đúng là 3 đường chéo chính. Lục giác đều có 3 cặp đỉnh đối diện, nối 3 cặp đỉnh này ta được đúng 3 đường chéo chính cắt nhau tại tâm.`,
             `The correct answer is 3 đường chéo chính. Connecting opposite vertices gives 3 main diagonals.`);
}

// c3b: Hình chữ nhật, hình thoi, hình bình hành, hình thang cân
function c3bEasy(){
  return mkQ(`Hình thoi có đặc điểm nào sau đây về các cạnh?`,
             `Which property is true about the sides of a rhombus?`,
             `Có 4 cạnh bằng nhau`,
             [`Chỉ có 2 cạnh đối bằng nhau`, `Các góc luôn bằng 90°`, `Có 3 cạnh bằng nhau`],
             `Đáp án đúng là "Có 4 cạnh bằng nhau". Định nghĩa: Hình thoi là tứ giác có 4 cạnh bằng nhau.`,
             `The correct answer is "Có 4 cạnh bằng nhau". A rhombus has 4 equal sides.`);
}

function c3bMedium(){
  const a = rand(5, 18);
  return mkQ(`Một hình thoi có độ dài cạnh là ${a} cm. Chu vi của hình thoi đó là:`,
             `A rhombus has side length ${a} cm. Its perimeter is:`,
             `${4 * a} cm`, [`${2 * a} cm`, `${a * a} cm`, `${4 * a + 4} cm`],
             `Đáp án đúng là ${4 * a} cm. Hình thoi có 4 cạnh bằng nhau nên chu vi bằng 4 · cạnh = 4 · ${a} = ${4 * a} cm.`,
             `The correct answer is ${4 * a} cm. Perimeter = 4 × ${a} = ${4 * a} cm.`);
}

function c3bHard(){
  return mkQ(`Hình thang cân có tính chất nào sau đây là ĐÚNG?`,
             `Which of the following properties of an isosceles trapezoid is TRUE?`,
             `Hai đường chéo bằng nhau`,
             [`Bốn cạnh bằng nhau`, `Hai đường chéo vuông góc với nhau`, `Hai góc đối bằng nhau`],
             `Đáp án đúng là "Hai đường chéo bằng nhau". Trong hình thang cân, hai đường chéo luôn có độ dài bằng nhau.`,
             `The correct answer is "Hai đường chéo bằng nhau". Diagonals of an isosceles trapezoid are equal.`);
}

// c3c: Chu vi và diện tích hình phẳng trong thực tế
function c3cEasy(){
  const a = rand(4, 15), b = rand(3, 10);
  return mkQ(`Một mảnh vườn hình chữ nhật có chiều dài ${a} m và chiều rộng ${b} m. Diện tích mảnh vườn là:`,
             `A rectangular garden is ${a} m long and ${b} m wide. Its area is:`,
             `${a * b} m²`, [`${2 * (a + b)} m²`, `${a * b + a} m²`, `${(a + b) * 2} m`],
             `Đáp án đúng là ${a * b} m². Diện tích hình chữ nhật bằng chiều dài nhân chiều rộng: ${a} · ${b} = ${a * b} m².`,
             `The correct answer is ${a * b} m². Area = ${a} × ${b} = ${a * b} m².`);
}

function c3cMedium(){
  const d1 = rand(4, 12) * 2, d2 = rand(3, 10);
  const ans = (d1 * d2) / 2;
  return mkQ(`Một miếng bìa hình thoi có độ dài hai đường chéo lần lượt là ${d1} cm và ${d2} cm. Diện tích miếng bìa là:`,
             `A rhombus piece of cardboard has diagonals ${d1} cm and ${d2} cm. Its area is:`,
             `${ans} cm²`, [`${d1 * d2} cm²`, `${ans + d1} cm²`, `${ans * 2} cm²`],
             `Đáp án đúng là ${ans} cm². Diện tích hình thoi bằng nửa tích độ dài hai đường chéo: (${d1} · ${d2}) : 2 = ${ans} cm².`,
             `The correct answer is ${ans} cm². Area = (${d1} × ${d2}) / 2 = ${ans} cm².`);
}

function c3cHard(){
  const a = rand(6, 12), b = rand(4, 8), h = rand(2, 6) * 2;
  const ans = ((a + b) * h) / 2;
  return mkQ(`Một thửa ruộng hình thang có đáy lớn ${a} m, đáy nhỏ ${b} m và chiều cao ${h} m. Diện tích thửa ruộng là:`,
             `A trapezoidal field has bases ${a} m and ${b} m, and height ${h} m. Its area is:`,
             `${ans} m²`, [`${(a + b) * h} m²`, `${ans + 10} m²`, `${ans - 5} m²`],
             `Đáp án đúng là ${ans} m². Diện tích hình thang: S = (đáy lớn + đáy nhỏ) · chiều cao : 2 = (${a} + ${b}) · ${h} : 2 = ${ans} m².`,
             `The correct answer is ${ans} m². Area = (${a} + ${b}) × ${h} / 2 = ${ans} m².`);
}

// c3d: Trục đối xứng & tâm đối xứng
function c3dEasy(){
  return mkQ(`Hình nào sau đây có tâm đối xứng?`,
             `Which of the following shapes has a center of symmetry?`,
             `Hình bình hành`,
             [`Tam giác đều`, `Hình thang cân`, `Tam giác vuông cân`],
             `Đáp án đúng là Hình bình hành. Giao điểm hai đường chéo của hình bình hành là tâm đối xứng của nó.`,
             `The correct answer is Hình bình hành. Center of symmetry is the intersection of diagonals.`);
}

function c3dMedium(){
  return mkQ(`Hình chữ nhật (không phải hình vuông) có bao nhiêu trục đối xứng?`,
             `How many axes of symmetry does a non-square rectangle have?`,
             `2 trục đối xứng`,
             [`4 trục đối xứng`, `1 trục đối xứng`, `Vô số trục đối xứng`],
             `Đáp án đúng là 2 trục đối xứng. Đó là hai đường thẳng đi qua trung điểm của hai cặp cạnh đối diện.`,
             `The correct answer is 2 trục đối xứng. Two axes connecting opposite midpoints.`);
}

function c3dHard(){
  return mkQ(`Chữ cái in hoa nào sau đây vừa có trục đối xứng vừa có tâm đối xứng?`,
             `Which capital letter has both an axis of symmetry and a center of symmetry?`,
             `H`, [`A`, `M`, `N`],
             `Đáp án đúng là H. Chữ H có hai trục đối xứng (trục dọc và trục ngang) và có tâm đối xứng ở chính giữa.`,
             `The correct answer is H. Letter H has both reflective and 180° rotational symmetry.`);
}

// c3z: Luyện tập tổng hợp hình học
function c3zEasy(){ return c3aEasy(); }
function c3zMedium(){ return c3cMedium(); }
function c3zHard(){ return c3cHard(); }


// ═══════════════════════════════════════════
// CHƯƠNG 4: PHÂN SỐ (c4)
// ═══════════════════════════════════════════

// c4a: Khái niệm phân số & phân số bằng nhau
function c4aEasy(){
  const a = rand(1, 9), b = rand(2, 9);
  return mkQ(`Trong phân số ${a}/${b}, tử số là số nào?`,
             `In fraction ${a}/${b}, which number is the numerator?`,
             `${a}`, [`${b}`, `${a + b}`, `${b - a || 1}`],
             `Đáp án đúng là ${a}. Trong phân số a/b (b ≠ 0), số a viết ở trên gạch ngang là tử số, b viết ở dưới là mẫu số.`,
             `The correct answer is ${a}. In fraction ${a}/${b}, ${a} is the numerator.`);
}

function c4aMedium(){
  const a = rand(1, 5), b = rand(2, 6), k = rand(2, 4);
  const num2 = a * k, den2 = b * k;
  return mkQ(`Tìm số nguyên x biết: x/${b} = ${num2}/${den2}`,
             `Find integer x such that: x/${b} = ${num2}/${den2}`,
             `${a}`, [`${a + 1}`, `${num2}`, `${a + k}`],
             `Đáp án đúng là ${a}. Rút gọn phân số ${num2}/${den2} bằng cách chia cả tử và mẫu cho ${k} ta được ${a}/${b}, suy ra x = ${a}.`,
             `The correct answer is ${a}. Simplifying ${num2}/${den2} by ${k} gives ${a}/${b}, so x = ${a}.`);
}

function c4aHard(){
  const mins = pick([15, 20, 30, 45]);
  const [rn, rd] = red(mins, 60);
  return mkQ(`Viết ${mins} phút dưới dạng phân số tối giản của một giờ:`,
             `Write ${mins} minutes as a fraction of an hour:`,
             `${rn}/${rd} giờ`,
             [`${mins}/60 giờ`, `${rn}/${rd + 1} giờ`, `${rn + 1}/${rd} giờ`],
             `Đáp án đúng là ${rn}/${rd} giờ. Vì 1 giờ = 60 phút nên ta có ${mins}/60 = ${rn}/${rd} giờ.`,
             `The correct answer is ${rn}/${rd} giờ. ${mins} minutes / 60 = ${rn}/${rd} hour.`);
}

// c4b: Rút gọn phân số & quy đồng mẫu số
function c4bEasy(){
  const [rn, rd] = [rand(1, 4), rand(5, 9)];
  const k = rand(2, 5);
  const n = rn * k, d = rd * k;
  return mkQ(`Rút gọn phân số ${n}/${d} về dạng phân số tối giản:`,
             `Simplify ${n}/${d} to simplest form:`,
             `${rn}/${rd}`, [`${rn * 2}/${rd * 2}`, `${rn + 1}/${rd}`, `${rn}/${rd + 1}`],
             `Đáp án đúng là ${rn}/${rd}. Chia cả tử và mẫu cho ƯCLN là ${k}: ${n}:${k} = ${rn} và ${d}:${k} = ${rd}, ta được ${rn}/${rd}.`,
             `The correct answer is ${rn}/${rd}. Divide numerator and denominator by ${k} = ${rn}/${rd}.`);
}

function c4bMedium(){
  const pairs = [[2, 3, 6], [3, 4, 12], [4, 6, 12], [6, 8, 24], [5, 10, 10], [6, 9, 18]];
  const [m1, m2, ans] = pick(pairs);
  return mkQ(`Mẫu số chung nhỏ nhất của hai phân số 1/${m1} và 1/${m2} là:`,
             `Least common denominator of 1/${m1} and 1/${m2} is:`,
             `${ans}`, [`${m1 * m2}`, `${ans * 2}`, `${ans + 2}`],
             `Đáp án đúng là ${ans}. Mẫu số chung nhỏ nhất chính là BCNN(${m1}, ${m2}) = ${ans}.`,
             `The correct answer is ${ans}. LCM of denominators ${m1} and ${m2} is ${ans}.`);
}

function c4bHard(){
  const k = rand(2, 4);
  const rn = rand(2, 5), rd = rand(7, 11);
  const n = -rn * k, d = rd * k;
  return mkQ(`Rút gọn phân số âm ${n}/${d} về tối giản:`,
             `Simplify negative fraction ${n}/${d}:`,
             `-${rn}/${rd}`, [`${rn}/${rd}`, `-${rn * 2}/${rd * 2}`, `-${rn}/${rd + 1}`],
             `Đáp án đúng là -${rn}/${rd}. Chia cả tử và mẫu cho ${k}: (${n}):${k} = -${rn} và ${d}:${k} = ${rd}, ta được -${rn}/${rd}.`,
             `The correct answer is -${rn}/${rd}. Divide by ${k} = -${rn}/${rd}.`);
}

// c4c: So sánh phân số
function c4cEasy(){
  const d = rand(5, 15);
  const [n1, n2] = twoDistinct(1, d - 1);
  const smaller = Math.min(n1, n2), larger = Math.max(n1, n2);
  return mkQ(`So sánh hai phân số ${smaller}/${d} và ${larger}/${d}: khẳng định nào ĐÚNG?`,
             `Compare ${smaller}/${d} and ${larger}/${d}: which statement is TRUE?`,
             `${smaller}/${d} < ${larger}/${d}`,
             [`${smaller}/${d} > ${larger}/${d}`, `${smaller}/${d} = ${larger}/${d}`, `${larger}/${d} < 0`],
             `Đáp án đúng là ${smaller}/${d} < ${larger}/${d}. Hai phân số cùng mẫu số dương, phân số nào có tử số nhỏ hơn thì nhỏ hơn: ${smaller} < ${larger} nên ${smaller}/${d} < ${larger}/${d}.`,
             `The correct answer is ${smaller}/${d} < ${larger}/${d}. Same positive denominator: ${smaller} < ${larger}.`);
}

function c4cMedium(){
  const d = rand(2, 9), r = rand(1, 4);
  return mkQ(`Khẳng định nào sau đây về phân số âm là ĐÚNG?`,
             `Which statement about negative fractions is TRUE?`,
             `-${r}/${d} < 0`,
             [`-${r}/${d} > 0`, `-${r}/${d} = 0`, `1/${d} < 0`],
             `Đáp án đúng là -${r}/${d} < 0. Mọi phân số có tử và mẫu khác dấu đều là phân số âm và nhỏ hơn 0.`,
             `The correct answer is -${r}/${d} < 0. Negative fractions are less than 0.`);
}

function c4cHard(){
  return mkQ(`Trong các phân số sau, phân số nào lớn nhất: 1/4; 2/4; 3/4; 5/4?`,
             `Which fraction is the largest: 1/4, 2/4, 3/4, 5/4?`,
             `5/4`, [`3/4`, `2/4`, `1/4`],
             `Đáp án đúng là 5/4. Các phân số có cùng mẫu số dương là 4, tử số lớn nhất là 5 nên phân số 5/4 là lớn nhất (5/4 > 1).`,
             `The correct answer is 5/4. Largest numerator among positive common denominators.`);
}

// c4d: Phép cộng & phép trừ phân số
function c4dEasy(){
  const d = rand(4, 15), a = rand(1, 3), b = rand(1, 3);
  const [rn, rd] = red(a + b, d);
  const ans = fstr(rn, rd);
  return mkQ(`Tính: ${a}/${d} + ${b}/${d}`,
             `Calculate: ${a}/${d} + ${b}/${d}`,
             ans, [`${a + b}/${d * 2}`, fstr(rn + 1, rd), fstr(rn, rd + 1)],
             `Đáp án đúng là ${ans}. Cộng các tử số và giữ nguyên mẫu số: (${a} + ${b})/${d} = ${a+b}/${d} = ${ans}.`,
             `The correct answer is ${ans}. (${a} + ${b})/${d} = ${ans}.`);
}

function c4dMedium(){
  const pairs = [
    [1, 2, 1, 3, '5/6'], [1, 2, 1, 4, '3/4'], [1, 3, 1, 4, '7/12'],
    [2, 3, 1, 6, '5/6'], [1, 4, 3, 8, '5/8']
  ];
  const [a, b, c, d, ans] = pick(pairs);
  return mkQ(`Tính: ${a}/${b} + ${c}/${d}`,
             `Calculate: ${a}/${b} + ${c}/${d}`,
             ans, [`${a + c}/${b + d}`, `${ans}1`, `1/2`],
             `Đáp án đúng là ${ans}. Quy đồng mẫu số chung rồi cộng hai tử số ta được ${ans}.`,
             `The correct answer is ${ans}. Convert to common denominator and add = ${ans}.`);
}

function c4dHard(){
  const pairs = [
    [3, 4, 1, 2, '1/4'], [5, 6, 1, 3, '1/2'], [7, 10, 2, 5, '3/10'],
    [2, 3, 1, 4, '5/12']
  ];
  const [a, b, c, d, ans] = pick(pairs);
  return mkQ(`Tính: ${a}/${b} - ${c}/${d}`,
             `Calculate: ${a}/${b} - ${c}/${d}`,
             ans, [`${a - c}/${b - d || 2}`, `${ans}0`, `1/3`],
             `Đáp án đúng là ${ans}. Quy đồng mẫu số chung rồi trừ hai tử số ta được kết quả tối giản là ${ans}.`,
             `The correct answer is ${ans}. Convert to common denominator and subtract = ${ans}.`);
}

// c4e: Phép nhân & phép chia phân số, hỗn số
function c4eEasy(){
  const a = rand(1, 3), b = rand(4, 6), c = rand(1, 3), d = rand(4, 6);
  const [rn, rd] = red(a * c, b * d);
  const ans = fstr(rn, rd);
  return mkQ(`Tính: (${a}/${b}) · (${c}/${d})`,
             `Calculate: (${a}/${b}) · (${c}/${d})`,
             ans, [`${a * c}/${b + d}`, `${a + c}/${b * d}`, fstr(rn + 1, rd)],
             `Đáp án đúng là ${ans}. Nhân tử với tử và mẫu với mẫu: (${a} · ${c}) / (${b} · ${d}) = ${a*c}/${b*d} = ${ans}.`,
             `The correct answer is ${ans}. (${a} × ${c}) / (${b} × ${d}) = ${ans}.`);
}

function c4eMedium(){
  const a = rand(1, 4), b = rand(3, 5), c = rand(1, 3), d = rand(2, 5);
  const [rn, rd] = red(a * d, b * c);
  const ans = fstr(rn, rd);
  return mkQ(`Tính: (${a}/${b}) : (${c}/${d})`,
             `Calculate: (${a}/${b}) : (${c}/${d})`,
             ans, [`${a * c}/${b * d}`, fstr(rn + 1, rd), fstr(rn, rd + 1)],
             `Đáp án đúng là ${ans}. Nhân phân số thứ nhất với nghịch đảo của phân số thứ hai: (${a}/${b}) · (${d}/${c}) = ${a*d}/${b*c} = ${ans}.`,
             `The correct answer is ${ans}. Multiply by reciprocal: (${a}/${b}) × (${d}/${c}) = ${ans}.`);
}

function c4eHard(){
  const w = rand(2, 4), n = rand(1, 3), d = rand(4, 7);
  const top = w * d + n;
  return mkQ(`Viết hỗn số ${w} ${n}/${d} dưới dạng phân số:`,
             `Convert mixed number ${w} ${n}/${d} to improper fraction:`,
             `${top}/${d}`, [`${w * n}/${d}`, `${top + 1}/${d}`, `${w * d}/${d}`],
             `Đáp án đúng là ${top}/${d}. Tử số mới bằng phần nguyên nhân mẫu cộng tử: (${w} · ${d} + ${n})/${d} = ${top}/${d}.`,
             `The correct answer is ${top}/${d}. (${w} × ${d} + ${n})/${d} = ${top}/${d}.`);
}

// c4f: Hai bài toán về phân số
function c4fEasy(){
  const d = pick([2, 3, 4, 5]), n = rand(1, d - 1);
  const mult = rand(4, 12);
  const total = d * mult;
  const ans = n * mult;
  return mkQ(`Tìm ${n}/${d} của số ${total}:`,
             `Find ${n}/${d} of ${total}:`,
             `${ans}`, [`${ans + 2}`, `${ans - 2}`, `${total - ans}`],
             `Đáp án đúng là ${ans}. Muốn tìm ${n}/${d} của số ${total}, ta lấy ${total} · (${n}/${d}) = ${ans}.`,
             `The correct answer is ${ans}. Compute ${total} × (${n}/${d}) = ${ans}.`);
}

function c4fMedium(){
  const d = pick([2, 3, 4, 5]), n = rand(1, d - 1);
  const mult = rand(4, 10);
  const part = n * mult;
  const ans = d * mult;
  return mkQ(`Tìm một số biết ${n}/${d} của nó bằng ${part}:`,
             `Find a number knowing ${n}/${d} of it is ${part}:`,
             `${ans}`, [`${part * n}`, `${ans + 5}`, `${ans - 5}`],
             `Đáp án đúng là ${ans}. Muốn tìm số đó, ta lấy ${part} : (${n}/${d}) = ${part} · (${d}/${n}) = ${ans}.`,
             `The correct answer is ${ans}. Compute ${part} / (${n}/${d}) = ${ans}.`);
}

function c4fHard(){
  const total = rand(30, 45);
  const ans = Math.floor(total * 2 / 5);
  const fullTotal = ans * 5 / 2;
  return mkQ(`Lớp 6A có ${fullTotal} học sinh. Số học sinh giỏi chiếm 2/5 số học sinh cả lớp. Hỏi lớp 6A có bao nhiêu học sinh giỏi?`,
             `Class 6A has ${fullTotal} students. 2/5 are excellent. How many excellent students are there?`,
             `${ans} học sinh`, [`${ans + 2} học sinh`, `${ans - 2} học sinh`, `${fullTotal - ans} học sinh`],
             `Đáp án đúng là ${ans} học sinh. Số học sinh giỏi là: ${fullTotal} · (2/5) = ${ans} học sinh.`,
             `The correct answer is ${ans} học sinh. ${fullTotal} × (2/5) = ${ans}.`);
}

// c4z: Luyện tập tổng hợp phân số
function c4zEasy(){ return c4aEasy(); }
function c4zMedium(){ return c4dMedium(); }
function c4zHard(){ return c4fHard(); }


// ═══════════════════════════════════════════
// CHƯƠNG 5: SỐ THẬP PHÂN & TỈ SỐ PHẦN TRĂM (c5)
// ═══════════════════════════════════════════

// c5a: Khái niệm & so sánh số thập phân
function c5aEasy(){
  const n = rand(1, 9);
  return mkQ(`Phân số thập phân ${n}/10 được viết dưới dạng số thập phân là:`,
             `Write fraction ${n}/10 as a decimal:`,
             `0.${n}`, [`0.0${n}`, `${n}.0`, `0.${n * 10}`],
             `Đáp án đúng là 0.${n}. Phân số ${n}/10 có mẫu là 10 nên phần thập phân có 1 chữ số: ${n}/10 = 0.${n}.`,
             `The correct answer is 0.${n}. ${n}/10 = 0.${n}.`);
}

function c5aMedium(){
  const a = rand(2, 8);
  return mkQ(`Khẳng định so sánh nào sau đây là ĐÚNG?`,
             `Which decimal comparison is TRUE?`,
             `${a}.5 > ${a}.38`,
             [`${a}.5 < ${a}.38`, `${a}.09 > ${a}.1`, `${a}.4 = ${a}.04`],
             `Đáp án đúng là ${a}.5 > ${a}.38. Hai số có cùng phần nguyên ${a}, so sánh hàng phần mười ta có 5 > 3 nên ${a}.5 > ${a}.38.`,
             `The correct answer is ${a}.5 > ${a}.38. Comparing tenths: 5 > 3.`);
}

function c5aHard(){
  return mkQ(`So sánh hai số thập phân âm: -3.7 và -3.2:`,
             `Compare negative decimals: -3.7 and -3.2:`,
             `-3.7 < -3.2`,
             [`-3.7 > -3.2`, `-3.7 = -3.2`, `-3.2 < -3.7`],
             `Đáp án đúng là -3.7 < -3.2. Với hai số thập phân âm, vì 3.7 > 3.2 nên -3.7 < -3.2.`,
             `The correct answer is -3.7 < -3.2. Since 3.7 > 3.2, -3.7 < -3.2.`);
}

// c5b: Phép tính số thập phân
function c5bEasy(){
  const a = (rand(10, 40) / 10), b = (rand(10, 40) / 10);
  const ans = +(a + b).toFixed(1);
  return mkQ(`Tính: ${a} + ${b}`,
             `Calculate: ${a} + ${b}`,
             `${ans}`, [`${+(ans + 0.2).toFixed(1)}`, `${+(ans - 0.3).toFixed(1)}`, `${+(ans + 1).toFixed(1)}`],
             `Đáp án đúng là ${ans}. Đặt tính thẳng cột dấu phẩy rồi cộng như số tự nhiên: ${a} + ${b} = ${ans}.`,
             `The correct answer is ${ans}. ${a} + ${b} = ${ans}.`);
}

function c5bMedium(){
  const a = (rand(11, 25) / 10), b = rand(2, 5);
  const ans = +(a * b).toFixed(1);
  return mkQ(`Tính: ${a} · ${b}`,
             `Calculate: ${a} · ${b}`,
             `${ans}`, [`${+(ans + 0.5).toFixed(1)}`, `${+(ans - 0.4).toFixed(1)}`, `${+(a * 10).toFixed(1)}`],
             `Đáp án đúng là ${ans}. Nhân như hai số tự nhiên rồi đặt dấu phẩy ở kết quả có 1 chữ số thập phân: ${a} · ${b} = ${ans}.`,
             `The correct answer is ${ans}. ${a} × ${b} = ${ans}.`);
}

function c5bHard(){
  const a = (rand(20, 50) / 10), b = (rand(10, 25) / 10);
  const ans = +(a - b).toFixed(1);
  return mkQ(`Tính: ${a} - ${b}`,
             `Calculate: ${a} - ${b}`,
             `${ans}`, [`${+(ans + 0.4).toFixed(1)}`, `${+(ans - 0.2).toFixed(1)}`, `${+(a + b).toFixed(1)}`],
             `Đáp án đúng là ${ans}. Đặt tính thẳng cột dấu phẩy rồi trừ: ${a} - ${b} = ${ans}.`,
             `The correct answer is ${ans}. ${a} - ${b} = ${ans}.`);
}

// c5c: Làm tròn & ước lượng
function c5cEasy(){
  const dec = pick([2, 3, 7, 8]);
  const n = +(rand(3, 15) + dec / 10).toFixed(1);
  const ans = Math.round(n);
  return mkQ(`Làm tròn số thập phân ${n} đến hàng đơn vị:`,
             `Round ${n} to the nearest whole number:`,
             `${ans}`, [`${ans + 1}`, `${ans - 1}`, `${ans + 2}`],
             `Đáp án đúng là ${ans}. Chữ số hàng phần mười là ${dec}: nếu ≥ 5 ta cộng 1 vào hàng đơn vị, nếu < 5 ta giữ nguyên. Do đó ${n} làm tròn thành ${ans}.`,
             `The correct answer is ${ans}. Rounding ${n} gives ${ans}.`);
}

function c5cMedium(){
  const n = +(rand(10, 90) / 100 + rand(2, 9)).toFixed(2);
  const ans = +(Math.round(n * 10) / 10).toFixed(1);
  return mkQ(`Làm tròn số ${n} đến chữ số thập phân thứ nhất (hàng phần mười):`,
             `Round ${n} to the tenths place:`,
             `${ans}`, [`${+(+ans + 0.2).toFixed(1)}`, `${+(+ans - 0.2).toFixed(1)}`, `${Math.round(n)}`],
             `Đáp án đúng là ${ans}. Quan sát chữ số hàng phần trăm ngay sau để quyết định tăng hay giữ nguyên hàng phần mười, kết quả là ${ans}.`,
             `The correct answer is ${ans}. Rounding to tenths yields ${ans}.`);
}

function c5cHard(){
  return mkQ(`Ước lượng kết quả của phép nhân 19.8 · 5.1 bằng cách làm tròn đến hàng đơn vị:`,
             `Estimate 19.8 · 5.1 by rounding factors to whole numbers:`,
             `100`, [`120`, `90`, `110`],
             `Đáp án đúng là 100. Làm tròn 19.8 ≈ 20 và 5.1 ≈ 5, ta ước lượng tích: 20 · 5 = 100.`,
             `The correct answer is 100. Estimate: 20 × 5 = 100.`);
}

// c5d: Tỉ số & Tỉ số phần trăm
function c5dEasy(){
  const pairs = [[1, 2, '50%'], [1, 4, '25%'], [3, 4, '75%'], [1, 5, '20%'], [2, 5, '40%'], [3, 5, '60%']];
  const [a, b, ans] = pick(pairs);
  return mkQ(`Tỉ số phần trăm của ${a} và ${b} là:`,
             `The percentage of ${a} out of ${b} is:`,
             ans, [`${parseInt(ans) + 10}%`, `${parseInt(ans) - 10}%`, `${parseInt(ans) + 5}%`],
             `Đáp án đúng là ${ans}. Ta tính: (${a} : ${b}) · 100% = ${ans}.`,
             `The correct answer is ${ans}. (${a} / ${b}) × 100% = ${ans}.`);
}

function c5dMedium(){
  const pct = pick([10, 20, 25, 50]);
  const base = rand(2, 10) * 20;
  const ans = (base * pct) / 100;
  return mkQ(`Tìm ${pct}% của ${base} kg:`,
             `Find ${pct}% of ${base} kg:`,
             `${ans} kg`, [`${ans + 5} kg`, `${ans - 3} kg`, `${ans * 2} kg`],
             `Đáp án đúng là ${ans} kg. Ta tính: (${base} · ${pct}) : 100 = ${ans} kg.`,
             `The correct answer is ${ans} kg. (${base} × ${pct}) / 100 = ${ans} kg.`);
}

function c5dHard(){
  const price = rand(10, 30) * 10000;
  const discPct = pick([10, 20, 25]);
  const pay = price * (100 - discPct) / 100;
  return mkQ(`Một chiếc áo giá ${price.toLocaleString('vi-VN')} đồng được giảm giá ${discPct}%. Số tiền thực tế người mua phải trả là:`,
             `A shirt costs ${price} VND with ${discPct}% discount. The final price is:`,
             `${pay.toLocaleString('vi-VN')} đồng`,
             [`${(price * discPct / 100).toLocaleString('vi-VN')} đồng`,
              `${(pay + 10000).toLocaleString('vi-VN')} đồng`,
              `${(pay - 10000).toLocaleString('vi-VN')} đồng`],
             `Đáp án đúng là ${pay.toLocaleString('vi-VN')} đồng. Số tiền được giảm là ${price * discPct / 100} đồng, số tiền thực tế phải trả là: ${price} - ${price * discPct / 100} = ${pay.toLocaleString('vi-VN')} đồng.`,
             `The correct answer is ${pay.toLocaleString('vi-VN')} đồng. Final price is ${pay}.`);
}

// c5z: Luyện tập tổng hợp số thập phân
function c5zEasy(){ return c5aEasy(); }
function c5zMedium(){ return c5bMedium(); }
function c5zHard(){ return c5dHard(); }


// ═══════════════════════════════════════════
// CHƯƠNG 6: ĐIỂM, ĐOẠN THẲNG & GÓC (c6)
// ═══════════════════════════════════════════

// c6a: Điểm, đường thẳng & vị trí tương đối
function c6aEasy(){
  return mkQ(`Qua hai điểm phân biệt A và B, vẽ được bao nhiêu đường thẳng?`,
             `How many straight lines pass through two distinct points A and B?`,
             `Chỉ 1 đường thẳng`,
             [`2 đường thẳng`, `Vô số đường thẳng`, `Không có đường thẳng nào`],
             `Đáp án đúng là "Chỉ 1 đường thẳng". Có một và chỉ một đường thẳng đi qua hai điểm phân biệt cho trước.`,
             `The correct answer is "Chỉ 1 đường thẳng". Exactly one straight line passes through two points.`);
}

function c6aMedium(){
  return mkQ(`Cho điểm B nằm giữa hai điểm A và C. Đẳng thức nào sau đây là ĐÚNG?`,
             `If B is between A and C, which equation is TRUE?`,
             `AB + BC = AC`,
             [`AB + AC = BC`, `AC + BC = AB`, `AB = BC = AC`],
             `Đáp án đúng là AB + BC = AC. Khi điểm B nằm giữa A và C thì độ dài đoạn lớn bằng tổng hai đoạn nhỏ: AB + BC = AC.`,
             `The correct answer is AB + BC = AC. Point B between A and C implies AB + BC = AC.`);
}

function c6aHard(){
  return mkQ(`Hai đường thẳng phân biệt có thể có nhiều nhất bao nhiêu điểm chung?`,
             `At most how many intersection points can two distinct lines have?`,
             `1 điểm chung`,
             [`2 điểm chung`, `Vô số điểm chung`, `Không có điểm nào`],
             `Đáp án đúng là 1 điểm chung. Hai đường thẳng phân biệt hoặc cắt nhau (có 1 điểm chung) hoặc song song (không có điểm chung nào).`,
             `The correct answer is 1 điểm chung. Two distinct lines intersect at most at 1 point.`);
}

// c6b: Tia & hai tia đối nhau
function c6bEasy(){
  return mkQ(`Hai tia đối nhau là hai tia:`,
             `Two opposite rays are rays that:`,
             `Chung gốc và tạo thành một đường thẳng`,
             [`Chung gốc và vuông góc`, `Song song với nhau`, `Không có điểm chung`],
             `Đáp án đúng là "Chung gốc và tạo thành một đường thẳng". Hai tia chung gốc tạo thành một đường thẳng được gọi là hai tia đối nhau.`,
             `The correct answer is "Chung gốc và tạo thành một đường thẳng". Opposite rays share origin and form a line.`);
}

function c6bMedium(){
  return mkQ(`Cho điểm O nằm trên đường thẳng xy. Hai tia đối nhau gốc O là:`,
             `Point O lies on line xy. The two opposite rays from origin O are:`,
             `Tia Ox và tia Oy`,
             [`Tia xy và tia yx`, `Tia Oy và tia xy`, `Tia Ox và tia xy`],
             `Đáp án đúng là Tia Ox và tia Oy. Điểm O chia đường thẳng xy thành hai phần là hai tia đối nhau Ox và Oy.`,
             `The correct answer is Tia Ox và tia Oy. Point O on line xy creates opposite rays Ox and Oy.`);
}

function c6bHard(){
  return mkQ(`Cho ba điểm A, B, C thẳng hàng theo thứ tự đó. Hai tia trùng nhau là:`,
             `Three collinear points A, B, C in that order. Which rays coincide?`,
             `Tia AB và tia AC`,
             [`Tia BA và tia BC`, `Tia AB và tia BA`, `Tia AC và tia CA`],
             `Đáp án đúng là Tia AB và tia AC. Vì hai điểm B và C cùng nằm về một phía đối với gốc A nên tia AB và tia AC là hai tia trùng nhau.`,
             `The correct answer is Tia AB và tia AC. Rays AB and AC have same origin and direction.`);
}

// c6c: Đoạn thẳng & trung điểm đoạn thẳng
function c6cEasy(){
  const len = rand(4, 16) * 2;
  return mkQ(`Cho đoạn thẳng AB dài ${len} cm. Điểm M là trung điểm của đoạn thẳng AB. Độ dài đoạn thẳng AM là:`,
             `Segment AB has length ${len} cm. M is midpoint of AB. Length of AM is:`,
             `${len / 2} cm`, [`${len / 2 + 1} cm`, `${len} cm`, `${len / 2 - 1} cm`],
             `Đáp án đúng là ${len / 2} cm. Vì M là trung điểm của AB nên AM = AB : 2 = ${len} : 2 = ${len / 2} cm.`,
             `The correct answer is ${len / 2} cm. Midpoint divides segment in half: ${len} / 2 = ${len / 2} cm.`);
}

function c6cMedium(){
  const am = rand(2, 6), mb = rand(3, 8);
  const ab = am + mb;
  return mkQ(`Cho điểm M nằm giữa hai điểm A và B. Biết AM = ${am} cm, MB = ${mb} cm. Độ dài đoạn thẳng AB là:`,
             `Point M is between A and B. AM = ${am} cm, MB = ${mb} cm. Length of AB is:`,
             `${ab} cm`, [`${Math.abs(am - mb)} cm`, `${ab + 2} cm`, `${am * mb} cm`],
             `Đáp án đúng là ${ab} cm. Vì M nằm giữa A và B nên AB = AM + MB = ${am} + ${mb} = ${ab} cm.`,
             `The correct answer is ${ab} cm. AB = AM + MB = ${am} + ${mb} = ${ab} cm.`);
}

function c6cHard(){
  const ab = rand(4, 10) * 4;
  const am = ab / 2, an = am / 2;
  return mkQ(`Cho đoạn thẳng AB = ${ab} cm. Gọi M là trung điểm của AB, N là trung điểm của AM. Độ dài đoạn AN là:`,
             `Segment AB = ${ab} cm. M is midpoint of AB, N is midpoint of AM. Length of AN is:`,
             `${an} cm`, [`${am} cm`, `${an + 2} cm`, `${an + 4} cm`],
             `Đáp án đúng là ${an} cm. Ta có AM = AB : 2 = ${ab} : 2 = ${am} cm; N là trung điểm của AM nên AN = AM : 2 = ${am} : 2 = ${an} cm.`,
             `The correct answer is ${an} cm. AM = ${ab} / 2 = ${am} cm, so AN = ${am} / 2 = ${an} cm.`);
}

// c6d: Góc & số đo góc
function c6dEasy(){
  return mkQ(`Góc có số đo bằng 90° được gọi là:`,
             `An angle measuring 90° is called a:`,
             `Góc vuông`, [`Góc nhọn`, `Góc tù`, `Góc bẹt`],
             `Đáp án đúng là Góc vuông. Định nghĩa: Góc có số đo bằng 90° là góc vuông.`,
             `The correct answer is Góc vuông. A 90° angle is a right angle.`);
}

function c6dMedium(){
  const acute = pick([30, 45, 60, 75]);
  return mkQ(`Góc có số đo ${acute}° thuộc loại góc nào?`,
             `An angle measuring ${acute}° is classified as:`,
             `Góc nhọn`, [`Góc tù`, `Góc vuông`, `Góc bẹt`],
             `Đáp án đúng là Góc nhọn. Vì 0° < ${acute}° < 90° nên góc có số đo ${acute}° là góc nhọn.`,
             `The correct answer is Góc nhọn. An angle of ${acute}° is acute.`);
}

function c6dHard(){
  const a = rand(3, 14) * 10;
  const ans = 180 - a;
  return mkQ(`Hai góc kề bù có tổng số đo bằng 180°. Nếu một góc có số đo là ${a}° thì góc còn lại có số đo là:`,
             `Two supplementary angles sum to 180°. If one measures ${a}°, the other is:`,
             `${ans}°`, [`${90 - (a % 90)}°`, `${ans + 10}°`, `${ans - 10}°`],
             `Đáp án đúng là ${ans}°. Hai góc kề bù có tổng số đo bằng 180°, nên góc còn lại bằng 180° - ${a}° = ${ans}°.`,
             `The correct answer is ${ans}°. Supplementary angle = 180 - ${a} = ${ans}°.`);
}

// c6z: Luyện tập tổng hợp hình học phẳng
function c6zEasy(){ return c6aEasy(); }
function c6zMedium(){ return c6cEasy(); }
function c6zHard(){ return c6dHard(); }


// ═══════════════════════════════════════════
// CHƯƠNG 7: THỐNG KÊ & XÁC SUẤT (c7)
// ═══════════════════════════════════════════

// c7a: Thu thập dữ liệu & biểu đồ tranh
function c7aEasy(){
  const val = rand(2, 6), icons = rand(3, 6);
  const total = val * icons;
  return mkQ(`Trên biểu đồ tranh, mỗi biểu tượng ⭐ đại diện cho ${val} điểm tốt. Bạn Nam sưu tầm được ${icons} biểu tượng ⭐. Hỏi Nam có bao nhiêu điểm tốt?`,
             `On a pictogram, each ⭐ represents ${val} merits. Nam has ${icons} ⭐. How many merits does he have?`,
             `${total} điểm`, [`${total + val} điểm`, `${total - val} điểm`, `${icons * 2} điểm`],
             `Đáp án đúng là ${total} điểm. Tổng số điểm tốt của bạn Nam là: ${val} · ${icons} = ${total} điểm.`,
             `The correct answer is ${total} điểm. Total = ${val} × ${icons} = ${total}.`);
}

function c7aMedium(){
  return mkQ(`Dãy dữ liệu nào sau đây là số liệu (dữ liệu số)?`,
             `Which of the following data sets is numerical data?`,
             `Chiều cao (cm) của các học sinh trong tổ`,
             [`Tên các môn học yêu thích`, `Nơi sinh của các thành viên`, `Xếp loại hạnh kiểm (Tốt, Khá)`],
             `Đáp án đúng là "Chiều cao (cm) của các học sinh trong tổ". Dữ liệu số (số liệu) là thông tin được biểu diễn bằng các con số.`,
             `The correct answer is "Chiều cao (cm) của các học sinh trong tổ". Numerical data is quantified in numbers.`);
}

function c7aHard(){
  const each = 10, full = rand(2, 5);
  const total = full * each + 5;
  return mkQ(`Biểu đồ tranh biểu thị số xe máy bán được: mỗi biểu tượng 🏍️ là ${each} xe, nửa biểu tượng là 5 xe. Tháng qua cửa hàng có ${full} biểu tượng nguyên và 1 nửa biểu tượng. Tổng số xe bán được là:`,
             `A shop sold ${full} full symbols (10 bikes each) and 1 half symbol (5 bikes). Total bikes sold is:`,
             `${total} xe`, [`${total + 5} xe`, `${total - 5} xe`, `${full * each} xe`],
             `Đáp án đúng là ${total} xe. Tổng số xe bán được là: ${full} · 10 + 5 = ${full * 10} + 5 = ${total} xe.`,
             `The correct answer is ${total} xe. Total = ${full * 10} + 5 = ${total}.`);
}

// c7b: Biểu đồ cột & cột kép
function c7bEasy(){
  return mkQ(`Trong biểu đồ cột, đại lượng nào được biểu diễn qua chiều cao của các cột?`,
             `In a bar chart, what does the height of the bar represent?`,
             `Số liệu (tần số / số lượng)`,
             [`Tên đối tượng`, `Màu sắc của cột`, `Thời gian khảo sát`],
             `Đáp án đúng là "Số liệu (tần số / số lượng)". Chiều cao của mỗi cột trong biểu đồ cột tương ứng với số lượng hoặc tần số của đối tượng đó.`,
             `The correct answer is "Số liệu (tần số / số lượng)". Bar height corresponds to value or count.`);
}

function c7bMedium(){
  return mkQ(`Biểu đồ cột kép thường được sử dụng khi nào?`,
             `When is a double bar chart typically used?`,
             `Để so sánh hai đối tượng trong cùng một tiêu chí`,
             [`Chỉ khi có duy nhất một đối tượng`, `Để tính chu vi hình học`, `Để vẽ trục số đối xứng`],
             `Đáp án đúng là "Để so sánh hai đối tượng trong cùng một tiêu chí". Biểu đồ cột kép đặt hai cột cạnh nhau giúp so sánh đối sánh trực quan.`,
             `The correct answer is "Để so sánh hai đối tượng trong cùng một tiêu chí". Used to compare two groups across categories.`);
}

function c7bHard(){
  const g1 = rand(15, 25), g2 = rand(10, 20);
  const total = g1 + g2;
  return mkQ(`Tổ 1 có ${g1} học sinh nam và ${g2} học sinh nữ. Hỏi tổng số học sinh của tổ 1 là bao nhiêu?`,
             `Group 1 has ${g1} boys and ${g2} girls. Total students in group 1 is:`,
             `${total} học sinh`, [`${total + 2} học sinh`, `${Math.abs(g1 - g2)} học sinh`, `${total - 3} học sinh`],
             `Đáp án đúng là ${total} học sinh. Tổng số học sinh bằng số bạn nam cộng số bạn nữ: ${g1} + ${g2} = ${total} học sinh.`,
             `The correct answer is ${total} học sinh. Total = ${g1} + ${g2} = ${total}.`);
}

// c7c: Kết quả có thể & sự kiện
function c7cEasy(){
  return mkQ(`Khi gieo một con xúc xắc 6 mặt cân đối, có bao nhiêu kết quả có thể xảy ra?`,
             `When rolling a standard 6-sided die, how many possible outcomes are there?`,
             `6 kết quả`, [`5 kết quả`, `12 kết quả`, `1 kết quả`],
             `Đáp án đúng là 6 kết quả. Con xúc xắc có 6 mặt được đánh số từ 1 đến 6 nên có đúng 6 kết quả có thể xảy ra.`,
             `The correct answer is 6 kết quả. A 6-sided die has 6 faces: {1, 2, 3, 4, 5, 6}.`);
}

function c7cMedium(){
  return mkQ(`Khi gieo một con xúc xắc 6 mặt, sự kiện "xuất hiện mặt 8 chấm" là sự kiện:`,
             `When rolling a 6-sided die, the event "rolling an 8" is:`,
             `Không thể xảy ra`,
             [`Chắc chắn xảy ra`, `Có thể xảy ra`, `Luôn luôn xảy ra`],
             `Đáp án đúng là "Không thể xảy ra". Con xúc xắc chỉ có các mặt từ 1 đến 6 chấm, không có mặt 8 chấm nên sự kiện này không thể xảy ra.`,
             `The correct answer is "Không thể xảy ra". 8 is impossible on a standard 6-sided die.`);
}

function c7cHard(){
  return mkQ(`Khi gieo một con xúc xắc 6 mặt, có bao nhiêu kết quả thuận lợi cho sự kiện "xuất hiện mặt có số chấm là số chẵn" (2; 4; 6)?`,
             `Rolling a 6-sided die, how many favorable outcomes for "even number" (2, 4, 6)?`,
             `3 kết quả`, [`2 kết quả`, `4 kết quả`, `6 kết quả`],
             `Đáp án đúng là 3 kết quả. Các mặt có số chấm chẵn là 2, 4, 6; do đó có tất cả 3 kết quả thuận lợi.`,
             `The correct answer is 3 kết quả. The even faces are {2, 4, 6} (3 outcomes).`);
}

// c7d: Xác suất thực nghiệm
function c7dEasy(){
  const total = 20, sap = rand(9, 13);
  return mkQ(`Tung một đồng xu ${total} lần, có ${sap} lần xuất hiện mặt Sấp. Xác suất thực nghiệm xuất hiện mặt Sấp là:`,
             `A coin was tossed ${total} times with ${sap} heads. Experimental probability of heads is:`,
             `${sap}/${total}`, [`${total - sap}/${total}`, `${sap}/${total + 2}`, `1/2`],
             `Đáp án đúng là ${sap}/${total}. Xác suất thực nghiệm = (Số lần xuất hiện mặt Sấp) / (Tổng số lần tung) = ${sap}/${total}.`,
             `The correct answer is ${sap}/${total}. Experimental probability is ${sap}/${total}.`);
}

function c7dMedium(){
  const pairs = [[50, 10, '1/5'], [50, 15, '3/10'], [50, 20, '2/5'], [50, 25, '1/2'], [40, 8, '1/5']];
  const [total, times, ans] = pick(pairs);
  return mkQ(`Gieo một con xúc xắc ${total} lần, thấy mặt 1 chấm xuất hiện ${times} lần. Xác suất thực nghiệm xuất hiện mặt 1 chấm (sau khi rút gọn) là:`,
             `Rolling a die ${total} times, face 1 appears ${times} times. Simplified experimental probability is:`,
             ans, [`${times}/${total + 5}`, `1/6`, `2/3`],
             `Đáp án đúng là ${ans}. Xác suất thực nghiệm là ${times}/${total}, chia cả tử và mẫu cho ước chung lớn nhất ta được phân số tối giản ${ans}.`,
             `The correct answer is ${ans}. Experimental probability = ${times}/${total} = ${ans}.`);
}

function c7dHard(){
  const total = 30, blue = rand(15, 20);
  const redCount = total - blue;
  const [rn, rd] = red(redCount, total);
  const ans = fstr(rn, rd);
  return mkQ(`Lấy ngẫu nhiên một viên bi từ hộp 30 lần có hoàn lại, có ${blue} lần lấy được bi xanh, còn lại là bi đỏ. Xác suất thực nghiệm lấy được viên bi đỏ là:`,
             `Drawing a marble with replacement 30 times: ${blue} blue, remaining red. Experimental probability of red is:`,
             ans, [`${blue}/30`, fstr(rn + 1, rd), `1/2`],
             `Đáp án đúng là ${ans}. Số lần lấy được bi đỏ là 30 - ${blue} = ${redCount} lần. Xác suất thực nghiệm lấy được bi đỏ là ${redCount}/30 = ${ans}.`,
             `The correct answer is ${ans}. Red count = 30 - ${blue} = ${redCount}, probability = ${redCount}/30 = ${ans}.`);
}

// c7z: Luyện tập tổng hợp thống kê & xác suất
function c7zEasy(){ return c7aEasy(); }
function c7zMedium(){ return c7cEasy(); }
function c7zHard(){ return c7dHard(); }


// ═══════════════════════════════════════════
// CHƯƠNG 8: ĐẤU TRƯỜNG TỔNG HỢP (c8)
// ═══════════════════════════════════════════
function c8aEasy(){
  return pick([c1aEasy, c2aEasy, c3aEasy, c4aEasy, c5aEasy, c6aEasy, c7aEasy])();
}
function c8aMedium(){
  return pick([c1bMedium, c2bMedium, c3cMedium, c4dMedium, c5bMedium, c6cMedium, c7cMedium])();
}
function c8aHard(){
  return pick([c1eHard, c2cHard, c3cHard, c4fHard, c5dHard, c6dHard, c7dHard])();
}

// ── Parent unit broad fallbacks ──
const c1Easy = c1zEasy, c1Medium = c1zMedium, c1Hard = c1zHard;
const c2Easy = c2zEasy, c2Medium = c2zMedium, c2Hard = c2zHard;
const c3Easy = c3zEasy, c3Medium = c3zMedium, c3Hard = c3zHard;
const c4Easy = c4zEasy, c4Medium = c4zMedium, c4Hard = c4zHard;
const c5Easy = c5zEasy, c5Medium = c5zMedium, c5Hard = c5zHard;
const c6Easy = c6zEasy, c6Medium = c6zMedium, c6Hard = c6zHard;
const c7Easy = c7zEasy, c7Medium = c7zMedium, c7Hard = c7zHard;
const c8Easy = c8aEasy, c8Medium = c8aMedium, c8Hard = c8aHard;

// ── CMAS / Tự luận & Đa lựa chọn ──
function c1CMAS(diff){
  if(diff===0) return mkSA(`Tính giá trị của 2³:`, `Calculate 2³:`, 8, CMAS_DOMAINS.SH);
  if(diff===1) return mkSA(`Ước chung lớn nhất ƯCLN(12, 18) là bao nhiêu?`, `GCF of 12 and 18 is?`, 6, CMAS_DOMAINS.SH);
  return mkMS(`Chọn TẤT CẢ các số nguyên tố trong các số sau:`, `Select ALL prime numbers:`,
              ['2', '3', '5'], ['2', '3', '5', '4', '6', '9'], CMAS_DOMAINS.SH);
}

function c2CMAS(diff){
  if(diff===0) return mkSA(`Tính: (-5) + (-8)`, `Calculate (-5) + (-8):`, -13, CMAS_DOMAINS.SH);
  if(diff===1) return mkSA(`Tính: (-6) · (-7)`, `Calculate (-6) · (-7):`, 42, CMAS_DOMAINS.SH);
  return mkMS(`Chọn TẤT CẢ các số nguyên âm trong các số sau:`, `Select ALL negative numbers:`,
              ['-3', '-8', '-15'], ['-3', '-8', '-15', '0', '4', '12'], CMAS_DOMAINS.SH);
}

function c3CMAS(diff){
  if(diff===0) return mkSA(`Một tam giác đều có cạnh 5 cm. Chu vi của nó là bao nhiêu cm?`, `Equilateral triangle side 5cm. Perimeter?`, 15, CMAS_DOMAINS.HH);
  if(diff===1) return mkSA(`Một hình vuông có cạnh 6 cm. Diện tích của nó là bao nhiêu cm²?`, `Square side 6cm. Area?`, 36, CMAS_DOMAINS.HH);
  return mkMS(`Chọn TẤT CẢ các hình có tâm đối xứng:`, `Select ALL shapes with a center of symmetry:`,
              ['Hình bình hành', 'Hình thoi', 'Hình vuông'],
              ['Hình bình hành', 'Hình thoi', 'Hình vuông', 'Tam giác đều', 'Hình thang cân'], CMAS_DOMAINS.HH);
}

function c4CMAS(diff){
  if(diff===0) return mkSA(`Tìm 1/2 của 50:`, `Find 1/2 of 50:`, 25, CMAS_DOMAINS.SH);
  if(diff===1) return mkSA(`Tìm x biết x/4 = 3/6 (nhập số):`, `Find x if x/4 = 3/6:`, 2, CMAS_DOMAINS.SH);
  return mkMS(`Chọn TẤT CẢ các phân số lớn hơn 1/2:`, `Select ALL fractions greater than 1/2:`,
              ['3/4', '4/5'], ['3/4', '4/5', '1/4', '2/5', '1/3'], CMAS_DOMAINS.SH);
}

function c5CMAS(diff){
  if(diff===0) return mkSA(`Tính: 2.5 + 3.5`, `Calculate 2.5 + 3.5:`, 6, CMAS_DOMAINS.SH);
  if(diff===1) return mkSA(`Tìm 10% của 250:`, `Find 10% of 250:`, 25, CMAS_DOMAINS.SH);
  return mkMS(`Chọn TẤT CẢ các số thập phân lớn hơn 2.5:`, `Select ALL decimals greater than 2.5:`,
              ['2.6', '3.1'], ['2.6', '3.1', '2.4', '1.9', '2.05'], CMAS_DOMAINS.SH);
}

function c6CMAS(diff){
  if(diff===0) return mkSA(`Cho M là trung điểm của AB = 10 cm. Tính độ dài AM (cm):`, `M is midpoint of AB = 10cm. AM = ?`, 5, CMAS_DOMAINS.HH);
  if(diff===1) return mkSA(`Một góc bẹt có số đo bằng bao nhiêu độ?`, `Degrees in a straight angle?`, 180, CMAS_DOMAINS.HH);
  return mkMS(`Chọn TẤT CẢ các góc nhọn trong các góc sau:`, `Select ALL acute angles:`,
              ['30°', '45°', '60°'], ['30°', '45°', '60°', '90°', '120°'], CMAS_DOMAINS.HH);
}

function c7CMAS(diff){
  if(diff===0) return mkSA(`Tung một con xúc xắc 6 mặt, có bao nhiêu kết quả có thể xảy ra?`, `Possible outcomes of 6-sided die?`, 6, CMAS_DOMAINS.TK);
  if(diff===1) return mkSA(`Một lớp có 20 nam và 15 nữ. Tổng số học sinh là:`, `20 boys and 15 girls. Total?`, 35, CMAS_DOMAINS.TK);
  return mkMS(`Chọn TẤT CẢ các số chẵn xuất hiện trên xúc xắc 6 mặt:`, `Select ALL even numbers on a 6-sided die:`,
              ['2', '4', '6'], ['2', '4', '6', '1', '3', '5'], CMAS_DOMAINS.TK);
}

function c8CMAS(diff){
  return c1CMAS(diff);
}

const CMAS_GEN = {
  c1: c1CMAS, c2: c2CMAS, c3: c3CMAS, c4: c4CMAS,
  c5: c5CMAS, c6: c6CMAS, c7: c7CMAS, c8: c8CMAS
};

// ── Dispatcher ───────────────────────────────────────────────
const GENERATORS = {
  // Broad-unit generators
  c1:[c1Easy,c1Medium,c1Hard],
  c2:[c2Easy,c2Medium,c2Hard],
  c3:[c3Easy,c3Medium,c3Hard],
  c4:[c4Easy,c4Medium,c4Hard],
  c5:[c5Easy,c5Medium,c5Hard],
  c6:[c6Easy,c6Medium,c6Hard],
  c7:[c7Easy,c7Medium,c7Hard],
  c8:[c8Easy,c8Medium,c8Hard],

  // Sub-topic generators
  c1a:[c1aEasy,c1aMedium,c1aHard], c1b:[c1bEasy,c1bMedium,c1bHard],
  c1c:[c1cEasy,c1cMedium,c1cHard], c1d:[c1dEasy,c1dMedium,c1dHard],
  c1e:[c1eEasy,c1eMedium,c1eHard], c1z:[c1zEasy,c1zMedium,c1zHard],

  c2a:[c2aEasy,c2aMedium,c2aHard], c2b:[c2bEasy,c2bMedium,c2bHard],
  c2c:[c2cEasy,c2cMedium,c2cHard], c2d:[c2dEasy,c2dMedium,c2dHard],
  c2z:[c2zEasy,c2zMedium,c2zHard],

  c3a:[c3aEasy,c3aMedium,c3aHard], c3b:[c3bEasy,c3bMedium,c3bHard],
  c3c:[c3cEasy,c3cMedium,c3cHard], c3d:[c3dEasy,c3dMedium,c3dHard],
  c3z:[c3zEasy,c3zMedium,c3zHard],

  c4a:[c4aEasy,c4aMedium,c4aHard], c4b:[c4bEasy,c4bMedium,c4bHard],
  c4c:[c4cEasy,c4cMedium,c4cHard], c4d:[c4dEasy,c4dMedium,c4dHard],
  c4e:[c4eEasy,c4eMedium,c4eHard], c4f:[c4fEasy,c4fMedium,c4fHard],
  c4z:[c4zEasy,c4zMedium,c4zHard],

  c5a:[c5aEasy,c5aMedium,c5aHard], c5b:[c5bEasy,c5bMedium,c5bHard],
  c5c:[c5cEasy,c5cMedium,c5cHard], c5d:[c5dEasy,c5dMedium,c5dHard],
  c5z:[c5zEasy,c5zMedium,c5zHard],

  c6a:[c6aEasy,c6aMedium,c6aHard], c6b:[c6bEasy,c6bMedium,c6bHard],
  c6c:[c6cEasy,c6cMedium,c6cHard], c6d:[c6dEasy,c6dMedium,c6dHard],
  c6z:[c6zEasy,c6zMedium,c6zHard],

  c7a:[c7aEasy,c7aMedium,c7aHard], c7b:[c7bEasy,c7bMedium,c7bHard],
  c7c:[c7cEasy,c7cMedium,c7cHard], c7d:[c7dEasy,c7dMedium,c7dHard],
  c7z:[c7zEasy,c7zMedium,c7zHard],

  c8a:[c8aEasy,c8aMedium,c8aHard]
};

function genQ(topicId, diff){
  let uid;
  if(topicId === 'mix' || !topicId || topicId === 'all'){
    let pool = (typeof enabledUnits !== 'undefined' && Array.isArray(enabledUnits) && enabledUnits.length > 0)
      ? enabledUnits
      : (typeof IM_UNITS !== 'undefined' && Array.isArray(IM_UNITS) && IM_UNITS.length > 0
          ? IM_UNITS.map(u => u.id)
          : Object.keys(GENERATORS));
    if(typeof powerup !== 'undefined' && powerup.anyTopic && typeof IM_UNITS !== 'undefined' && Array.isArray(IM_UNITS) && IM_UNITS.length > 0){
      pool = IM_UNITS.map(u => u.id);
    }
    const weak = (typeof practiceWeak !== 'undefined' && Array.isArray(practiceWeak) ? practiceWeak : []).filter(w => pool.includes(w));
    uid = pick(pool.concat(weak)) || (pool.length ? pick(pool) : 'c1a');
  } else if(typeof topicId === 'string' && !topicId.match(/^[a-z]\d+[a-z]$/)){
    const subPool = (typeof IM_UNITS !== 'undefined' && Array.isArray(IM_UNITS) && IM_UNITS.length > 0)
      ? IM_UNITS.filter(u => u.parent === topicId).map(u => u.id)
      : Object.keys(GENERATORS).filter(k => k.startsWith(topicId));
    uid = (subPool && subPool.length > 0) ? pick(subPool) : 'c1a';
  } else {
    uid = topicId;
  }
  if(!uid || typeof uid !== 'string') uid = 'c1a';

  const isParentUnit = !uid.match(/^[a-z]\d+[a-z]$/);
  if(isParentUnit && typeof CMAS_GEN !== 'undefined' && CMAS_GEN[uid] && Math.random()<0.3){
    const q=CMAS_GEN[uid](diff);
    q._unit=uid;
    return q;
  }
  if(!GENERATORS[uid]){
    const keys = Object.keys(GENERATORS);
    uid = keys.length ? keys[0] : 'c1a';
  }
  diff = Math.max(0, Math.min(2, Number(diff) || 0));
  let genFn = GENERATORS[uid] && GENERATORS[uid][diff];
  if(typeof genFn !== 'function'){
    genFn = (GENERATORS['c1a'] && GENERATORS['c1a'][0]) || Object.values(GENERATORS)[0][0];
  }

  let q;
  try {
    q = genFn();
  } catch(err) {
    console.error('Error generating question for unit ' + uid + ', diff ' + diff + ':', err);
    try {
      q = GENERATORS['c1a'][0]();
    } catch(e) {
      q = {
        question: "12 + 15 = ?",
        answer: "27",
        choices: ["25", "27", "29", "30"],
        why: "12 + 15 = 27"
      };
    }
  }

  q.answer = String(q.answer);
  let es = Array.isArray(q.choices_es) && q.choices_es.length === (q.choices ? q.choices.length : 0)
         ? q.choices_es.map(String) : null;
  if(q.choices_es && !es) delete q.choices_es;
  let pairs = (Array.isArray(q.choices) ? q.choices : [q.answer]).map((c,i) => [String(c), es ? es[i] : String(c)]);

  if(!pairs.some(p => p[0] === q.answer)) pairs[0] = [q.answer, q.answer];
  const seen = new Set();
  pairs = pairs.filter(p => seen.has(p[0]) ? false : (seen.add(p[0]), true));
  for(let guard=0; pairs.length<4 && guard<200; guard++){
    const v = String(rand(1, 30) + (guard > 60 ? guard : 0));
    if(seen.has(v)) continue;
    seen.add(v); pairs.push([v, v]);
  }
  if(pairs.length > 4){
    const ans = pairs.find(p => p[0] === q.answer);
    pairs = [ans, ...pairs.filter(p => p !== ans)].slice(0, 4);
  }
  pairs = shuf(pairs);
  q.choices = pairs.map(p => p[0]);
  if(es) q.choices_es = pairs.map(p => p[1]);
  q._unit = uid;
  return q;
}

