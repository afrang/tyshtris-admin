import type { UiLocale } from './UiLanguage'

/**
 * Translates legacy component copy as it enters the DOM.  This keeps localization
 * centralized while older screens are gradually moved to explicit `t()` keys.
 * Text originating from the API (titles, names, comments, etc.) is deliberately
 * left alone unless it exactly matches a known piece of interface copy.
 */
const fa: Record<string, string> = {
  'Dashboard': 'داشبورد', 'Overview': 'نمای کلی', 'Content': 'محتوا', 'Content shortcuts': 'میانبرهای محتوا',
  'Blog Posts': 'نوشته‌های وبلاگ', 'Blog Post': 'نوشته وبلاگ', 'Posts': 'نوشته‌ها', 'Post': 'نوشته',
  'Blog Groups': 'گروه‌های وبلاگ', 'Blog group': 'گروه وبلاگ', 'Groups': 'گروه‌ها', 'Group': 'گروه',
  'Tags': 'برچسب‌ها', 'Tag': 'برچسب', 'Galleries': 'گالری‌ها', 'Gallery': 'گالری',
  'Media': 'رسانه', 'Forms': 'فرم‌ها', 'Form': 'فرم', 'Comments': 'دیدگاه‌ها',
  'Users': 'کاربران', 'User': 'کاربر', 'Settings': 'تنظیمات', 'Languages': 'زبان‌ها',
  'Language': 'زبان', 'Menu Manager': 'مدیریت منو', 'Menu groups': 'گروه‌های منو',
  'Menu group': 'گروه منو', 'Menu items': 'آیتم‌های منو', 'Menu item': 'آیتم منو', 'Website': 'وب‌سایت',
  'Search': 'جستجو', 'Category': 'دسته‌بندی', 'All categories': 'همه دسته‌بندی‌ها',
  'All languages': 'همه زبان‌ها', 'All tags': 'همه برچسب‌ها', 'All users': 'همه کاربران',
  'Title': 'عنوان', 'Slug': 'نامک', 'Status': 'وضعیت', 'Actions': 'عملیات', 'Created Date': 'تاریخ ایجاد',
  'Description': 'توضیحات', 'Name': 'نام', 'Key': 'کلید', 'Label': 'برچسب', 'Type': 'نوع',
  'Role': 'نقش', 'Email': 'ایمیل', 'Password': 'رمز عبور', 'Current password': 'رمز عبور فعلی',
  'New password': 'رمز عبور جدید', 'Display name': 'نام نمایشی', 'Direction': 'جهت',
  'Left to right': 'چپ به راست', 'Right to left': 'راست به چپ', 'Default language': 'زبان پیش‌فرض',
  'Active': 'فعال', 'Inactive': 'غیرفعال', 'Visible': 'نمایان', 'Hidden': 'پنهان',
  'Published': 'منتشرشده', 'Draft': 'پیش‌نویس', 'Pending': 'در انتظار', 'Approved': 'تأییدشده',
  'Rejected': 'ردشده', 'Admin': 'مدیر', 'Normal user': 'کاربر عادی', 'SuperAdmin': 'مدیر ارشد',
  'Add': 'افزودن', 'Create': 'ایجاد', 'Edit': 'ویرایش', 'Delete': 'حذف', 'Remove': 'برداشتن',
  'Save': 'ذخیره', 'Cancel': 'انصراف', 'Update': 'به‌روزرسانی', 'Copy': 'کپی', 'Duplicate': 'تکثیر',
  'Open': 'باز کردن', 'Close': 'بستن', 'Clear': 'پاک کردن', 'Refresh': 'تازه‌سازی', 'Replace': 'جایگزینی',
  'Submit': 'ارسال', 'Approve': 'تأیید', 'Reject': 'رد', 'Reply': 'پاسخ', 'Publish': 'انتشار',
  'Yes': 'بله', 'No': 'خیر', 'None': 'هیچ‌کدام', 'Optional': 'اختیاری', 'Required': 'الزامی',
  'Loading…': 'در حال بارگذاری…', 'Saving…': 'در حال ذخیره…', 'Creating…': 'در حال ایجاد…',
  'Copying…': 'در حال کپی…', 'Uploading…': 'در حال بارگذاری…', 'Saved': 'ذخیره شد', 'Updated': 'به‌روز شد',
  'Add post': 'افزودن نوشته', 'Create post': 'ایجاد نوشته', 'Edit post': 'ویرایش نوشته', 'Update post': 'به‌روزرسانی نوشته',
  'Add blog group': 'افزودن گروه وبلاگ', 'Create group': 'ایجاد گروه', 'Edit blog group': 'ویرایش گروه وبلاگ',
  'Add tag': 'افزودن برچسب', 'Create tag': 'ایجاد برچسب', 'Edit tag': 'ویرایش برچسب', 'Update tag': 'به‌روزرسانی برچسب',
  'Add gallery': 'افزودن گالری', 'Create gallery': 'ایجاد گالری', 'Edit gallery': 'ویرایش گالری', 'Update gallery': 'به‌روزرسانی گالری',
  'Add form': 'افزودن فرم', 'Create form': 'ایجاد فرم', 'Edit form': 'ویرایش فرم', 'Update form': 'به‌روزرسانی فرم',
  'Add user': 'افزودن کاربر', 'Create user': 'ایجاد کاربر', 'Edit user': 'ویرایش کاربر',
  'Add language': 'افزودن زبان', 'Create language': 'ایجاد زبان', 'Edit language': 'ویرایش زبان', 'Update language': 'به‌روزرسانی زبان',
  'Add menu group': 'افزودن گروه منو', 'Create menu group': 'ایجاد گروه منو', 'Add menu item': 'افزودن آیتم منو',
  'Add root item': 'افزودن آیتم اصلی', 'Add child': 'افزودن زیرآیتم', 'Create item': 'ایجاد آیتم', 'Edit item': 'ویرایش آیتم',
  'Back to list': 'بازگشت به فهرست', 'Back to group': 'بازگشت به گروه', 'View all': 'مشاهده همه',
  'Save changes': 'ذخیره تغییرات', 'Save details': 'ذخیره جزئیات', 'Save settings': 'ذخیره تنظیمات',
  'Save item': 'ذخیره آیتم', 'Save editor': 'ذخیره ویرایشگر', 'Save Q&A': 'ذخیره پرسش و پاسخ',
  'Search title, slug, tags…': 'جستجوی عنوان، نامک و برچسب‌ها…', 'Search tags…': 'جستجوی برچسب‌ها…',
  'Search groups…': 'جستجوی گروه‌ها…', 'Search by author, email, or comment…': 'جستجو با نویسنده، ایمیل یا دیدگاه…',
  'No posts yet.': 'هنوز نوشته‌ای وجود ندارد.', 'No posts match your filters.': 'نوشته‌ای با فیلترهای شما مطابقت ندارد.',
  'No blog groups yet.': 'هنوز گروه وبلاگی وجود ندارد.', 'No tags yet.': 'هنوز برچسبی وجود ندارد.',
  'No galleries yet.': 'هنوز گالری‌ای وجود ندارد.', 'No forms yet. Create one to start building.': 'هنوز فرمی وجود ندارد. برای شروع یک فرم بسازید.',
  'No users yet.': 'هنوز کاربری وجود ندارد.', 'No languages yet.': 'هنوز زبانی وجود ندارد.',
  'No comments yet.': 'هنوز دیدگاهی وجود ندارد.', 'No comments match this filter.': 'دیدگاهی با این فیلتر مطابقت ندارد.',
  'No submissions yet.': 'هنوز پاسخی ثبت نشده است.', 'No questions yet. Add the first question for this item.': 'هنوز پرسشی وجود ندارد. نخستین پرسش را اضافه کنید.',
  'No items in this menu yet': 'هنوز آیتمی در این منو وجود ندارد', 'No containers yet.': 'هنوز کانتینری وجود ندارد.',
  'No image yet': 'هنوز تصویری وجود ندارد', 'No gallery images': 'تصویری در گالری نیست', 'No logo': 'لوگویی وجود ندارد',
  'Loading posts…': 'در حال بارگذاری نوشته‌ها…', 'Loading gallery…': 'در حال بارگذاری گالری…',
  'Loading media…': 'در حال بارگذاری رسانه…', 'Loading comments…': 'در حال بارگذاری دیدگاه‌ها…',
  'Loading settings…': 'در حال بارگذاری تنظیمات…', 'Loading menu groups…': 'در حال بارگذاری گروه‌های منو…',
  'Loading menu group…': 'در حال بارگذاری گروه منو…', 'Loading menu item…': 'در حال بارگذاری آیتم منو…',
  'Loading editor…': 'در حال بارگذاری ویرایشگر…', 'Loading EditorTrya…': 'در حال بارگذاری ویرایشگر تریا…',
  'Loading Q&A…': 'در حال بارگذاری پرسش و پاسخ…', 'Loading preview…': 'در حال بارگذاری پیش‌نمایش…',
  'Loading current CMS data…': 'در حال بارگذاری اطلاعات سامانه…',
  'Failed to load posts.': 'بارگذاری نوشته‌ها ناموفق بود.', 'Failed to load blog groups.': 'بارگذاری گروه‌های وبلاگ ناموفق بود.',
  'Failed to load tags.': 'بارگذاری برچسب‌ها ناموفق بود.', 'Failed to load galleries.': 'بارگذاری گالری‌ها ناموفق بود.',
  'Failed to load gallery.': 'بارگذاری گالری ناموفق بود.', 'Failed to load forms.': 'بارگذاری فرم‌ها ناموفق بود.',
  'Failed to load form.': 'بارگذاری فرم ناموفق بود.', 'Failed to load users.': 'بارگذاری کاربران ناموفق بود.',
  'Failed to load languages.': 'بارگذاری زبان‌ها ناموفق بود.', 'Failed to load comments.': 'بارگذاری دیدگاه‌ها ناموفق بود.',
  'Failed to load settings.': 'بارگذاری تنظیمات ناموفق بود.', 'Failed to load media.': 'بارگذاری رسانه ناموفق بود.',
  'Failed to load dashboard data.': 'بارگذاری اطلاعات داشبورد ناموفق بود.', 'Upload failed.': 'بارگذاری ناموفق بود.',
  'Delete failed.': 'حذف ناموفق بود.', 'Settings saved.': 'تنظیمات ذخیره شد.', 'Fields saved': 'فیلدها ذخیره شدند',
  'Q&A saved.': 'پرسش و پاسخ ذخیره شد.', 'Logo uploaded.': 'لوگو بارگذاری شد.', 'User created.': 'کاربر ایجاد شد.',
  'User saved.': 'کاربر ذخیره شد.', 'User deleted.': 'کاربر حذف شد.', 'Menu item deleted.': 'آیتم منو حذف شد.',
  'Delete blog post?': 'نوشته وبلاگ حذف شود؟', 'Delete blog group?': 'گروه وبلاگ حذف شود؟',
  'Delete tag?': 'برچسب حذف شود؟', 'Delete gallery?': 'گالری حذف شود؟', 'Delete form?': 'فرم حذف شود؟',
  'Delete user?': 'کاربر حذف شود؟', 'Delete language?': 'زبان حذف شود؟', 'Delete menu group?': 'گروه منو حذف شود؟',
  'Delete menu item?': 'آیتم منو حذف شود؟', 'Delete media?': 'رسانه حذف شود؟', 'Delete media file?': 'فایل رسانه حذف شود؟',
  'Delete file?': 'فایل حذف شود؟', 'Delete submission?': 'پاسخ حذف شود؟', 'Delete this comment?': 'این دیدگاه حذف شود؟',
  'This post will be permanently removed.': 'این نوشته برای همیشه حذف خواهد شد.',
  'This group and its relations will be permanently removed.': 'این گروه و ارتباط‌های آن برای همیشه حذف خواهند شد.',
  'This tag will be permanently removed.': 'این برچسب برای همیشه حذف خواهد شد.',
  'This user will be permanently removed.': 'این کاربر برای همیشه حذف خواهد شد.',
  'This language will be permanently removed.': 'این زبان برای همیشه حذف خواهد شد.',
  'This response will be permanently removed.': 'این پاسخ برای همیشه حذف خواهد شد.',
  'This media file will be permanently removed.': 'این فایل رسانه برای همیشه حذف خواهد شد.',
  'This video/audio file will be permanently removed.': 'این فایل ویدیو/صدا برای همیشه حذف خواهد شد.',
  'Thumbnail': 'تصویر بندانگشتی', 'Upload image': 'بارگذاری تصویر', 'Upload images': 'بارگذاری تصاویر',
  'Replace image': 'جایگزینی تصویر', 'Choose thumbnail': 'انتخاب تصویر بندانگشتی', 'Gallery images': 'تصاویر گالری',
  'Gallery media': 'رسانه‌های گالری', 'Gallery thumbnail': 'تصویر بندانگشتی گالری', 'Post thumbnail': 'تصویر بندانگشتی نوشته',
  'Group thumbnail': 'تصویر بندانگشتی گروه', 'Media file': 'فایل رسانه', 'Upload file': 'بارگذاری فایل',
  'Replace file': 'جایگزینی فایل', 'Image': 'تصویر', 'Video And Audio': 'ویدیو و صدا', 'Audio track': 'قطعه صوتی',
  'YouTube link': 'پیوند یوتیوب', 'YouTube URL': 'نشانی یوتیوب', 'Image file': 'فایل تصویر',
  'Details': 'جزئیات', 'Details & Publish': 'جزئیات و انتشار', 'SEO': 'سئو', 'Meta title': 'عنوان متا',
  'Meta description': 'توضیحات متا', 'Keyword': 'کلیدواژه', 'Content Mix': 'ترکیب محتوا',
  'Content Activity (7 days)': 'فعالیت محتوا (۷ روز)', 'Recent Posts': 'نوشته‌های اخیر',
  'EditorTrya': 'ویرایشگر تریا', 'Editor side panel': 'پنل کناری ویرایشگر', 'Live preview': 'پیش‌نمایش زنده',
  'Preview': 'پیش‌نمایش', 'Inspector': 'بازرس', 'Components': 'اجزا', 'Container': 'کانتینر',
  'Add container': 'افزودن کانتینر', 'Add component': 'افزودن جزء', 'Delete component': 'حذف جزء',
  'Delete container': 'حذف کانتینر', 'Move up': 'انتقال به بالا', 'Move down': 'انتقال به پایین',
  'Move earlier': 'انتقال به قبل', 'Move later': 'انتقال به بعد', 'Drag to reorder': 'برای مرتب‌سازی بکشید',
  'Text': 'متن', 'Heading': 'تیتر', 'Button': 'دکمه', 'Divider': 'جداکننده', 'Quote': 'نقل‌قول',
  'Layout': 'چیدمان', 'Appearance': 'ظاهر', 'Background': 'پس‌زمینه', 'Background color': 'رنگ پس‌زمینه',
  'Text color': 'رنگ متن', 'Title color': 'رنگ عنوان', 'Line color': 'رنگ خط', 'Icon color': 'رنگ آیکون',
  'Width': 'عرض', 'Height': 'ارتفاع', 'Max width': 'حداکثر عرض', 'Max height': 'حداکثر ارتفاع',
  'Min height': 'حداقل ارتفاع', 'Padding': 'فاصله داخلی', 'Gap': 'فاصله', 'Columns': 'ستون‌ها',
  'Align': 'تراز', 'Left': 'چپ', 'Center': 'وسط', 'Right': 'راست', 'Top': 'بالا', 'Bottom': 'پایین',
  'Bold': 'توپر', 'Italic': 'مورب', 'Underline': 'زیرخط', 'Strikethrough': 'خط‌خورده',
  'Undo': 'واگرد', 'Redo': 'بازانجام', 'Bullet list': 'فهرست نشانه‌دار', 'Numbered list': 'فهرست شماره‌دار',
  'Fields': 'فیلدها', 'Field settings': 'تنظیمات فیلد', 'Add a field': 'افزودن فیلد', 'Form tools': 'ابزارهای فرم',
  'Submissions': 'پاسخ‌ها', 'Question': 'پرسش', 'Questions': 'پرسش‌ها', 'Answer': 'پاسخ', 'Answers': 'پاسخ‌ها',
  'Add question': 'افزودن پرسش', 'Add answer': 'افزودن پاسخ', 'Answer text': 'متن پاسخ', 'Q&A': 'پرسش و پاسخ',
  'Basics': 'اطلاعات پایه', 'Storage': 'فضای ذخیره‌سازی', 'Local': 'محلی', 'Local backend': 'سرور محلی',
  'S3 storage': 'فضای S3', 'Bucket': 'باکت', 'Region': 'منطقه', 'Endpoint': 'نقطه پایانی',
  'Access key': 'کلید دسترسی', 'Secret key': 'کلید محرمانه', 'Public base URL': 'نشانی عمومی پایه',
  'Website logo': 'لوگوی وب‌سایت', 'Site name': 'نام سایت', 'Page title': 'عنوان صفحه',
  'Social networks': 'شبکه‌های اجتماعی', 'Addresses': 'نشانی‌ها', 'Phones': 'تلفن‌ها', 'Emails': 'ایمیل‌ها',
  'Add address': 'افزودن نشانی', 'Add phone': 'افزودن تلفن', 'Add email': 'افزودن ایمیل',
  'My profile': 'پروفایل من', 'Active account': 'حساب فعال', 'Reset password': 'بازنشانی رمز عبور',
  'Only admins can create users.': 'فقط مدیران می‌توانند کاربر ایجاد کنند.',
  'You can only edit your own profile.': 'شما فقط می‌توانید پروفایل خودتان را ویرایش کنید.',
  'Manage posts with multi-group and multi-tag assignments.': 'نوشته‌ها را با چند گروه و چند برچسب مدیریت کنید.',
  'Manage admin and normal users, update profiles, passwords, and roles.': 'مدیران و کاربران عادی، پروفایل‌ها، رمزها و نقش‌ها را مدیریت کنید.',
  'Review, approve, and moderate comments from the public site.': 'دیدگاه‌های سایت را بررسی، تأیید و مدیریت کنید.',
  'Flat tags for blog posts. Slugs are unique and GUID-based IDs are used everywhere.': 'برچسب‌های ساده برای نوشته‌ها؛ نامک‌ها یکتا هستند و شناسه‌های GUID استفاده می‌شوند.',
  'Hierarchical content groups using GUID identifiers. Root groups have no parent.': 'گروه‌های محتوایی سلسله‌مراتبی با شناسه GUID؛ گروه‌های اصلی والد ندارند.',
  'Manage site languages. Set a default language and choose LTR or RTL so content forms match the writing direction.': 'زبان‌های سایت را مدیریت و زبان پیش‌فرض و جهت نوشتار را تعیین کنید.',
  'Create and manage multi-field forms with a visual builder.': 'فرم‌های چندفیلدی را با فرم‌ساز دیداری ایجاد و مدیریت کنید.',
  'Create galleries with a thumbnail and mixed image, video, or audio items.': 'گالری‌هایی با تصویر بندانگشتی و مجموعه تصویر، ویدیو و صدا بسازید.',
  'Website identity, social links, contact details, and file storage.': 'هویت وب‌سایت، شبکه‌های اجتماعی، اطلاعات تماس و فضای ذخیره‌سازی.',
  'Name, SEO fields, and logo for your site.': 'نام، اطلاعات سئو و لوگوی سایت شما.',
  'Select…': 'انتخاب…', 'Choose one option': 'یک گزینه انتخاب کنید', 'Nothing selected': 'چیزی انتخاب نشده',
  'All': 'همه', 'Root (no parent)': 'اصلی (بدون والد)', 'No parent (root)': 'بدون والد (اصلی)',
  'Parent': 'والد', 'Parent group': 'گروه والد', 'Root level': 'سطح اصلی', 'Sort order': 'ترتیب نمایش',
  'Function': 'کارکرد', 'Custom URL': 'نشانی سفارشی', 'Resolved URL': 'نشانی نهایی', 'Mega menu': 'مگامنو',
  'Introduction to Artificial Intelligence': 'مقدمه‌ای بر هوش مصنوعی', 'Technology': 'فناوری',
  'About us': 'درباره ما', 'Contact us': 'تماس با ما', 'Summer collection': 'مجموعه تابستانی',
}

const en = Object.fromEntries(Object.entries(fa).map(([english, persian]) => [persian, english]))
const attributes = ['placeholder', 'title', 'aria-label'] as const

function translate(value: string, locale: UiLocale): string {
  const dictionary = locale === 'fa' ? fa : en
  const exact = dictionary[value.trim()]
  if (exact) return value.replace(value.trim(), exact)

  // Dynamic labels often contain counts. Translate their stable UI words while
  // preserving numbers and user-provided values.
  let result = value
  const entries = Object.entries(dictionary).sort(([a], [b]) => b.length - a.length)
  for (const [source, target] of entries) {
    if (source.length < 4 || !result.includes(source)) continue
    result = result.split(source).join(target)
  }
  return result
}

function localize(root: ParentNode, locale: UiLocale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const parent = node.parentElement
    if (!parent || parent.closest('script, style, code, [data-no-ui-translate]')) continue
    const next = translate(node.nodeValue ?? '', locale)
    if (next !== node.nodeValue) node.nodeValue = next
  }

  const elements = root instanceof Element ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')]
  for (const element of elements) {
    if (element.closest('[data-no-ui-translate]')) continue
    for (const attribute of attributes) {
      const value = element.getAttribute(attribute)
      if (value) element.setAttribute(attribute, translate(value, locale))
    }
  }
}

export function localizeDocument(locale: UiLocale): () => void {
  localize(document.body, locale)
  const observer = new MutationObserver((mutations) => {
    observer.disconnect()
    for (const mutation of mutations) {
      if (mutation.type === 'characterData' && mutation.target.parentNode) localize(mutation.target.parentNode, locale)
      for (const node of mutation.addedNodes) {
        if (node instanceof Element || node instanceof DocumentFragment) localize(node, locale)
        else if (node.parentNode) localize(node.parentNode, locale)
      }
    }
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  })
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  return () => observer.disconnect()
}
