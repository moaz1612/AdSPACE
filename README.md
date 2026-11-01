# Adspace

منصة إعلانات بنظام البانر بنسبة 9:16 (سلايدر). أي شخص يرفع إعلانه، وصاحب المنصة يقبله أو يرفضه، والإعلانات المقبولة تظهر في العارض تلقائيا طوال المدة المحددة.

**التقنية:** React + TypeScript + Vite، تطبيق PWA يُثبّت على الموبايل، قاعدة البيانات والدخول وتخزين الصور على Supabase، والاستضافة على GitHub Pages. كله مجاني.

## الميزات

- **العارض:** إعلانات بملء الشاشة 9:16، تبديل تلقائي، سحب وأسهم، ضغط مطول للإيقاف، زر رابط لكل إعلان.
- **للمعلن:** حساب بالبريد، رفع صورة تقص تلقائيا إلى 9:16 مع معاينة، متابعة الحالة (قيد المراجعة / مقبول / مرفوض مع السبب)، وعدد المشاهدات والنقرات.
- **للأدمن:** قبول بمدة نشر تحددها أو رفض بسبب، ترتيب الإعلانات، إخفاء وإظهار، تعديل، تمديد، حذف، نشر مباشر، وإحصائيات كل إعلان.
- **الأمان:** صلاحيات على مستوى قاعدة البيانات (RLS). الزوار يرون الإعلانات الجارية فقط، والمعلن يرى إعلاناته، ورقم التواصل لا يظهر إلا للأدمن.

## التشغيل على جهازك

```bash
npm install
cp .env.example .env.local   # ثم ضع قيم Supabase داخله
npm run dev
```

## الإعداد خطوة بخطوة

### 1) Supabase

1. أنشئ مشروعا جديدا على [supabase.com](https://supabase.com).
2. افتح **SQL Editor**، والصق محتوى الملف `supabase/migrations/0001_init.sql` كاملا، واضغط **Run**. هذا ينشئ الجداول والصلاحيات وحاوية الصور `ad-images`.
3. من **Project Settings → API** انسخ `Project URL` و `anon public key` وضعهما في `.env.local`.
4. من **Authentication → URL Configuration** اضبط `Site URL` على رابط موقعك بعد النشر، مثل `https://USERNAME.github.io/adspace/`، وأضفه أيضا في `Redirect URLs` (وأضف `http://localhost:5173` للتجربة المحلية).
5. اختياري للتجربة السريعة: من **Authentication → Providers → Email** عطّل `Confirm email` حتى يدخل المستخدم مباشرة بعد التسجيل.

### 2) اجعل حسابك أدمن

سجّل حسابا في التطبيق ببريدك، ثم شغّل في SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'YOUR-EMAIL@example.com');
```

أعد تحميل التطبيق وستظهر لك تبويبة **الإدارة**.

### 3) GitHub

```bash
git init -b main
git add .
git commit -m "Adspace: first version"
git remote add origin https://github.com/USERNAME/adspace.git
git push -u origin main
```

ثم في المستودع على GitHub:

1. **Settings → Secrets and variables → Actions → New repository secret**، وأضف سرّين:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. **Settings → Pages → Source**، اختر **GitHub Actions**.
3. أي `push` على `main` يبني التطبيق وينشره تلقائيا على `https://USERNAME.github.io/adspace/`.

> مفتاح `anon` مصمم ليكون علنيا، والحماية الفعلية من سياسات RLS في ملف SQL. لا تضع مفتاح `service_role` في المشروع أبدا.

### 4) تثبيته كتطبيق على الموبايل

افتح الرابط في Chrome (أندرويد) أو Safari (آيفون) واختر **Add to Home Screen**.

## هيكل المشروع

```
supabase/migrations/0001_init.sql   قاعدة البيانات والصلاحيات والتخزين
src/lib/                            الاتصال بـ Supabase، معالجة الصور، أدوات مساعدة
src/auth/AuthContext.tsx            تسجيل الدخول والدور (معلن / أدمن)
src/components/Slider.tsx           عارض 9:16
src/pages/                          العرض، أضف إعلان، إعلاناتي، الإدارة، الدخول
.github/workflows/deploy.yml        البناء والنشر على GitHub Pages
```

## ملاحظات

- الصور تحفظ بصيغة JPEG بحجم 720×1280، وحد الرفع في Supabase ٣ ميجابايت.
- العارض يحدّث الإعلانات كل دقيقة وعند العودة للتطبيق.
- المشاهدات والنقرات تسجل من الزوار مباشرة، ولا يوجد حماية متقدمة من التكرار، فاعتبرها أرقاما تقريبية.
- الدفع حاليا يدوي (تحويل أو فودافون كاش) خارج التطبيق، والأدمن يقبل الإعلان بعد الاستلام.

## أفكار للمرحلة التالية

- دعم فيديو قصير في الإعلان.
- دفع إلكتروني وتفعيل الإعلان تلقائيا بعد الدفع.
- إشعار بالبريد للمعلن عند القبول أو الرفض.
- حدود مشاهدة يومية وتقارير أسبوعية لكل معلن.
