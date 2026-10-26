// Every error shown in web admin goes through errorText: server codes become plain text (Uzbek by default),
// and an unknown code is never shown raw. Sentences already come from the server in Uzbek.
type L = (uz: string, ru: string, en: string) => string;
type T = [string, string, string];

const GENERIC: T = ['Amal bajarilmadi. Qayta urinib ko‘ring.', 'Действие не выполнено. Повторите попытку.', 'The action failed. Please try again.'];
const DENIED: T = ['Bu amal uchun ruxsatingiz yo‘q.', 'Нет прав на это действие.', 'You are not allowed to do this.'];
const INPUT: T = ['Majburiy maydonlarni tekshiring.', 'Проверьте обязательные поля.', 'Check the required fields.'];
const STATE: T = ['Bu holatda amalni bajarib bo‘lmaydi. Sahifani yangilang.', 'Это действие сейчас недоступно. Обновите страницу.', 'This can’t be done in the current state. Refresh the page.'];
const CHANGED: T = ['Ma’lumot o‘zgargan. Sahifani yangilab, qayta urinib ko‘ring.', 'Данные изменились. Обновите страницу и повторите.', 'The data changed. Refresh the page and try again.'];

const TEXT: Record<string, T> = {
  NETWORK_ERROR: ['Server bilan aloqa yo‘q. Internetni tekshiring.', 'Нет связи с сервером. Проверьте интернет.', 'No connection to the server. Check the internet.'],
  INVALID_RESPONSE: ['Serverdan noto‘g‘ri javob keldi. Birozdan keyin qayta urinib ko‘ring.', 'Сервер вернул неверный ответ. Повторите позже.', 'The server sent an invalid response. Try again later.'],
  REQUEST_FAILED: GENERIC, INVALID_ENDPOINT: GENERIC, WAREHOUSE_SERVER_ERROR: ['Serverda xatolik yuz berdi.', 'Ошибка на сервере.', 'A server error occurred.'],
  ADMIN_PERMISSION_DENIED: DENIED, ORDER_CORRECTION_REJECTED: DENIED, ORDER_TIMER_REJECTED: ['Taymer sozlamalarini saqlab bo‘lmadi. Qiymatlarni tekshiring.', 'Не удалось сохранить таймеры. Проверьте значения.', 'Could not save the timers. Check the values.'],
  ADMIN_INACTIVE: ['Hisobingiz o‘chirilgan.', 'Ваш аккаунт отключён.', 'Your account is disabled.'],
  ADMIN_SESSION_REPLACED: ['Boshqa qurilmada kirildi. Qaytadan kiring.', 'Выполнен вход на другом устройстве. Войдите снова.', 'Signed in elsewhere. Please sign in again.'],
  SESSION_REPLACED: ['Boshqa qurilmada kirildi. Qaytadan kiring.', 'Выполнен вход на другом устройстве. Войдите снова.', 'Signed in elsewhere. Please sign in again.'],
  LOGIN_LOCKED_15_MINUTES: ['Juda ko‘p urinish. 15 daqiqadan keyin qayta urinib ko‘ring.', 'Слишком много попыток. Повторите через 15 минут.', 'Too many attempts. Try again in 15 minutes.'],
  ADMIN_WEAK_PASSWORD: ['Parol kamida 10 belgi bo‘lishi va katta-kichik harf, raqam hamda belgi bo‘lishi kerak.', 'Пароль: не менее 10 символов, заглавные и строчные буквы, цифра и символ.', 'Password: at least 10 characters with upper and lower case, a number and a symbol.'],
  ADMIN_INVALID_ROLE: ['Rol noto‘g‘ri.', 'Неверная роль.', 'Invalid role.'], ADMIN_INVALID_PERMISSION: ['Ruxsat noto‘g‘ri.', 'Неверное право.', 'Invalid permission.'],
  ADMIN_OWNER_ACCESS_FIXED: ['Egasining ruxsatlarini o‘zgartirib bo‘lmaydi.', 'Права владельца изменить нельзя.', 'The owner’s access can’t be changed.'],
  CUSTOMER_MERGE_INVALID: ['Bu hisoblarni birlashtirib bo‘lmaydi.', 'Эти аккаунты нельзя объединить.', 'These accounts can’t be merged.'],
  CUSTOMER_MERGE_PHONE_MISMATCH: ['Hisoblarning telefon raqami bir xil emas.', 'Номера телефонов не совпадают.', 'The phone numbers don’t match.'],
  CUSTOMER_MERGE_REASON_REQUIRED: ['Birlashtirish sababini yozing.', 'Укажите причину объединения.', 'Enter the reason for merging.'],
  PRODUCT_IS_IN_USE: ['Mahsulot buyurtmalarda ishlatilgan. Uni o‘chirish o‘rniga nofaol qiling.', 'Товар используется в заказах. Сделайте его неактивным.', 'The product is used in orders. Deactivate it instead.'],
  PRICE_CHANGED: ['Narx o‘zgargan. Sahifani yangilang.', 'Цена изменилась. Обновите страницу.', 'The price changed. Refresh the page.'],
  PRICE_REASON_REQUIRED: ['Narx o‘zgarishi sababini yozing.', 'Укажите причину изменения цены.', 'Enter the reason for the price change.'],
  STOCK_UNAVAILABLE: ['Omborda yetarli mahsulot yo‘q.', 'Недостаточно товара на складе.', 'Not enough stock.'],
  PROVIDER_ERROR: ['To‘lov tizimi xato qaytardi.', 'Платёжная система вернула ошибку.', 'The payment provider returned an error.'],
  PROVIDER_UNAVAILABLE: ['To‘lov tizimi vaqtincha ishlamayapti.', 'Платёжная система временно недоступна.', 'The payment provider is unavailable.'],
  NOT_CONFIGURED: ['Bu funksiya serverda sozlanmagan.', 'Функция не настроена на сервере.', 'This feature is not set up on the server.'],
  RECONCILIATION_FAILED: ['Payme bilan solishtirib bo‘lmadi.', 'Не удалось сверить с Payme.', 'Could not reconcile with Payme.'],
  REFUND_MISMATCH: ['Qaytarilgan summa mos kelmadi.', 'Сумма возврата не совпадает.', 'The refund amount doesn’t match.'],
  REFUND_NOT_PENDING: ['Bu buyurtma bo‘yicha qaytarish kutilmayapti.', 'По этому заказу возврат не ожидается.', 'No refund is pending for this order.'],
  RULE_INVALID_VALUE: ['Qiymat 1 dan 100 gacha bo‘lishi kerak.', 'Значение должно быть от 1 до 100.', 'The value must be 1–100.'],
  RULE_NOT_SWITCHABLE: ['Bu qoidani o‘chirib-yoqib bo‘lmaydi.', 'Это правило нельзя переключать.', 'This rule can’t be switched.'],
  PERIOD_CLOSED: ['Bu sana yopilgan davrga tushadi (Sozlamalar → Qoidalar → Davr yopish).', 'Эта дата в закрытом периоде (Настройки → Правила → Закрытие периода).', 'This date is in a closed period.'],
  PERIOD_FUTURE_DATE: ['Kelajakdagi sanagacha yopib bo‘lmaydi.', 'Нельзя закрыть период будущей датой.', 'You can’t close up to a future date.'],
  PERIOD_REASON_REQUIRED: ['Davrni ochish uchun sabab yozing.', 'Укажите причину открытия периода.', 'Enter a reason to reopen the period.'],
  FINANCE_PHOTO_REQUIRED: ['Xarajatga chek rasmini qo‘shing.', 'Добавьте фото чека.', 'Add a receipt photo.'],
  FINANCE_INVALID_AMOUNT: ['Summani tekshiring (0 dan katta, 2 xonadan ko‘p kasr yo‘q).', 'Проверьте сумму.', 'Check the amount.'],
  FINANCE_FUTURE_DATE: ['Sana kelajakda bo‘lishi mumkin emas.', 'Дата не может быть в будущем.', 'The date can’t be in the future.'],
  FINANCE_DUPLICATE_TYPE: ['Bunday xarajat turi bor.', 'Такой тип расхода уже есть.', 'This expense type already exists.'],
  SUPPLIER_INVALID_AMOUNT: ['Summa noto‘g‘ri.', 'Неверная сумма.', 'Invalid amount.'],
  SUPPLIER_INVALID_DATE: ['Sana noto‘g‘ri yoki kelajakda.', 'Дата неверна или в будущем.', 'The date is invalid or in the future.'],
  SUPPLIER_INVALID_TERMS: ['To‘lov muddati noto‘g‘ri.', 'Неверный срок оплаты.', 'Invalid payment terms.'],
  SUPPLIER_OVERPAYMENT: ['To‘lov qarzdan oshib ketdi.', 'Оплата превышает долг.', 'The payment is more than the amount owed.'],
  SUPPLIER_REFERENCE_CONFLICT: ['Bu to‘lov raqami boshqa to‘lovda ishlatilgan.', 'Этот номер платежа уже использован.', 'This payment reference is already used.'],
  RECEIPT_MISMATCH: ['Kirim ma’lumotlari mos kelmadi.', 'Данные прихода не совпадают.', 'The receipt data doesn’t match.'],
  RECEIPT_PHOTO_REQUIRED: ['Yaroqsiz tovar uchun rasm qo‘shing.', 'Добавьте фото негодного товара.', 'Add a photo of the unfit goods.'],
  RECEIPT_PRICE_NOTE_REQUIRED: ['Narxi oldingisidan ko‘p farq qilgan qatorga izoh yozing.', 'Укажите причину для строки с сильно изменившейся ценой.', 'Add a note to the line whose price changed a lot.'],
  PARTIAL_RETURN_ALREADY_SAVED: ['Qisman qaytarish allaqachon saqlangan.', 'Частичный возврат уже сохранён.', 'The partial return is already saved.'],
  PARTIAL_RETURN_INVALID: ['Qisman qaytarish ma’lumotlari noto‘g‘ri.', 'Неверные данные частичного возврата.', 'Invalid partial return data.'],
  PARTIAL_RETURN_UNAVAILABLE: ['Bu buyurtmada qisman qaytarish mumkin emas.', 'Для этого заказа частичный возврат недоступен.', 'A partial return isn’t possible for this order.'],
  RETURN_PHOTO_REQUIRED: ['Rasm qo‘shing.', 'Добавьте фото.', 'Add a photo.'], RETURN_REASON_REQUIRED: ['Sababni yozing.', 'Укажите причину.', 'Enter the reason.'],
  RETURN_PHOTO_INVALID: ['Rasm noto‘g‘ri.', 'Неверное фото.', 'Invalid photo.'], RETURN_PHOTO_TOO_LARGE: ['Rasm juda katta.', 'Фото слишком большое.', 'The photo is too large.'],
  RETURN_PHOTO_ALREADY_SAVED: ['Rasm allaqachon saqlangan.', 'Фото уже сохранено.', 'The photo is already saved.'],
  INVENTORY_NOT_ENABLED: ['Partiya hisobi yoqilmagan.', 'Партионный учёт не включён.', 'Batch tracking is not enabled.'],
  INVENTORY_ALREADY_OPENED: ['Bu mahsulot uchun boshlang‘ich sanash allaqachon tasdiqlangan.', 'Начальные остатки уже проведены.', 'Opening stock is already approved for this product.'],
  INVENTORY_ALREADY_RESERVED: ['Mahsulot allaqachon band qilingan.', 'Товар уже зарезервирован.', 'The stock is already reserved.'],
  INVENTORY_BALANCE_MISMATCH: CHANGED, INVENTORY_STOCK_CHANGED: ['Qoldiq o‘zgardi. Sanashni bekor qilib, qaytadan boshlang.', 'Остаток изменился. Начните пересчёт заново.', 'Stock changed. Start the count again.'],
  INVENTORY_BATCH_IN_USE: ['Partiya ishlatilmoqda.', 'Партия используется.', 'The batch is in use.'],
  INVENTORY_BATCH_NOT_SELLABLE: ['Bu partiyani sotib bo‘lmaydi (muddati o‘tgan yoki karantinda).', 'Партию нельзя продавать.', 'This batch can’t be sold.'],
  INVENTORY_BIN_EMPTY: ['Bu manzilda partiya qoldig‘i yo‘q.', 'В этой ячейке нет остатков.', 'This bin has no stock.'],
  INVENTORY_BIN_LOCKED: ['Bu manzil hozir sanalmoqda.', 'Эта ячейка сейчас пересчитывается.', 'This bin is being counted.'],
  INVENTORY_BIN_MISMATCH: ['Manzil kodi mos emas.', 'Код ячейки не совпадает.', 'The bin code does not match.'],
  INVENTORY_COST_REQUIRED: ['Tannarxni kiriting.', 'Укажите себестоимость.', 'Enter the cost.'],
  INVENTORY_DUPLICATE_BATCH: ['Bir xil partiya ikki marta kiritilgan.', 'Партия введена дважды.', 'The same batch is entered twice.'],
  INVENTORY_EXPIRY_IMMUTABLE: ['Partiyaning yaroqlilik muddatini o‘zgartirib bo‘lmaydi.', 'Срок годности партии менять нельзя.', 'The batch expiry can’t be changed.'],
  INVENTORY_LEGACY_ORDERS_ACTIVE: ['Mahsulot faol buyurtmalarda bor. Ular yakunlangach qayta urinib ko‘ring.', 'Товар есть в активных заказах.', 'The product is in active orders.'],
  INVENTORY_ORDER_REFERENCE_REQUIRED: ['Buyurtma raqamini kiriting.', 'Укажите номер заказа.', 'Enter the order number.'],
  INVENTORY_PHOTO_REQUIRED: ['Rasm qo‘shing.', 'Добавьте фото.', 'Add a photo.'],
  INVENTORY_RESERVED_STOCK: ['Manzildagi mahsulot buyurtma uchun band.', 'Товар в ячейке зарезервирован.', 'Stock in this bin is reserved.'],
  INVENTORY_RETURN_BIN_REQUIRED: ['Qaytgan tovar uchun manzilni tanlang.', 'Выберите ячейку для возврата.', 'Choose a bin for the returned goods.'],
  INVENTORY_VARIANCE_REASON_REQUIRED: ['Farq bor. Farq sababini yozing.', 'Есть расхождение. Укажите причину.', 'There is a difference. Enter the reason.'],
  TAXI_NOT_READY: ['Taksi faqat ombor «Tayyor» qilgan, to‘langan buyurtmaga chaqiriladi.', 'Такси вызывается только для оплаченного заказа в статусе «Готов».', 'A taxi can be booked only for a paid order marked Ready.'],
  TAXI_NOT_ON_THE_WAY: ['Buyurtma hozir yo‘lda emas. Sahifani yangilang.', 'Заказ сейчас не в пути. Обновите страницу.', 'The order is not on the way. Refresh the page.'],
  TAXI_NOT_TAXI_ORDER: ['Bu buyurtma taksi orqali emas.', 'Этот заказ не на такси.', 'This is not a taxi order.'],
  WAREHOUSE_INVALID_INPUT: INPUT, WAREHOUSE_INVALID_STATE: STATE,
  WAREHOUSE_NOT_FOUND: ['Ma’lumot topilmadi. Sahifani yangilang.', 'Данные не найдены. Обновите страницу.', 'Not found. Refresh the page.'],
  WAREHOUSE_NOT_ENABLED: ['Ombor hali faollashtirilmagan.', 'Склад ещё не включён.', 'Warehouse is not enabled yet.'],
  WAREHOUSE_PREPARATION_DISABLED: ['Ombor ilovasi hali yoqilmagan.', 'Приложение склада ещё не включено.', 'The warehouse app is not enabled yet.'],
  WAREHOUSE_ALREADY_CLAIMED: ['Buyurtmani boshqa xodim olgan.', 'Заказ уже взят другим сотрудником.', 'Another worker has taken this order.'],
  WAREHOUSE_BARCODE_MISMATCH: ['Shtrix-kod mahsulotga mos emas.', 'Штрихкод не совпадает с товаром.', 'The barcode does not match the product.'],
  WAREHOUSE_BLIND_COUNT_REQUIRED: ['Avval mahsulotlarni sanang.', 'Сначала пересчитайте товары.', 'Count the products first.'],
  WAREHOUSE_COUNT_MISMATCH: ['Sanash hujjatga mos kelmadi. Qayta sanang.', 'Пересчёт не совпал с документом.', 'The count doesn’t match the document.'],
  WAREHOUSE_DUPLICATE: ['Bunday yozuv allaqachon bor.', 'Такая запись уже есть.', 'This already exists.'],
  WAREHOUSE_DUPLICATE_PRODUCT: ['Bir mahsulot ikki marta kiritilgan.', 'Товар указан дважды.', 'The same product is entered twice.'],
  WAREHOUSE_EXPIRED_BATCH: ['Yaroqlilik sanasi bugundan keyin bo‘lishi kerak.', 'Срок годности должен быть позже сегодняшнего дня.', 'Expiry must be later than today.'],
  WAREHOUSE_INCOMPLETE: ['Hamma mahsulot hali tekshirilmagan.', 'Не все товары проверены.', 'Not all products are checked yet.'],
  WAREHOUSE_INSUFFICIENT_STOCK: ['Qoldiq yetarli emas.', 'Недостаточно остатка.', 'Not enough stock.'],
  WAREHOUSE_INVALID_HIERARCHY: ['Qator zonaga, javon qatorga tegishli bo‘lishi kerak.', 'Ряд должен быть в зоне, ячейка — в ряду.', 'A row belongs to a zone, a bin to a row.'],
  WAREHOUSE_INVALID_INVOICE_IMAGE: ['Rasmni tekshiring (2 MB gacha).', 'Проверьте изображение (до 2 МБ).', 'Check the image (up to 2 MB).'],
  WAREHOUSE_LOGIN_FAILED: ['Login yoki parol noto‘g‘ri.', 'Неверный логин или пароль.', 'Wrong login or password.'],
  WAREHOUSE_NOT_OWNER: ['Bu buyurtma boshqa xodimga biriktirilgan.', 'Заказ закреплён за другим сотрудником.', 'This order belongs to another worker.'],
  WAREHOUSE_NOT_READY: ['Buyurtma hali qadoqlanmagan.', 'Заказ ещё не упакован.', 'The order is not packed yet.'],
  WAREHOUSE_ORDER_UNAVAILABLE: ['Buyurtma bekor qilingan, to‘lov qaytarilgan yoki kuryerga berilgan.', 'Заказ отменён, оплата возвращена или передан курьеру.', 'The order was cancelled, refunded or handed to a courier.'],
  WAREHOUSE_PASSWORD_SHORT: ['Parol kamida 10 belgi bo‘lishi va katta-kichik harf, raqam hamda belgi bo‘lishi kerak.', 'Пароль: не менее 10 символов, буквы разного регистра, цифра и символ.', 'Password: at least 10 characters with mixed case, a number and a symbol.'],
  WAREHOUSE_PRODUCT_INACTIVE: ['Mahsulot nofaol.', 'Товар неактивен.', 'The product is inactive.'],
  WAREHOUSE_RECEIPT_METADATA_REQUIRED: ['Har bir qatorda kirim narxi, yaroqlilik sanasi va miqdorni tekshiring.', 'Проверьте цену, срок годности и количество в каждой строке.', 'Check price, expiry and quantity on every line.'],
  WAREHOUSE_SEPARATE_APPROVER_REQUIRED: ['Hujjatni boshqa xodim tasdiqlashi kerak.', 'Документ должен провести другой сотрудник.', 'Another person must approve this.'],
  WAREHOUSE_SESSION_REPLACED: ['Boshqa qurilmada kirildi. Qaytadan kiring.', 'Выполнен вход на другом устройстве.', 'Signed in elsewhere.'],
  WAREHOUSE_TOO_MANY: ['Miqdor kerakli sondan ko‘p.', 'Количество больше необходимого.', 'The quantity is more than needed.'],
  WAREHOUSE_USE_RECEIPTS: ['Qoldiqni kirim hujjati orqali o‘zgartiring.', 'Меняйте остаток через приход.', 'Change stock through a receipt.'],
};

/** The text to show for an error: a known code in the current language, a server sentence as is, else a plain generic message. */
export function errorText(e: unknown, l: L, fallback?: string): string {
  const err = e as { message?: unknown; resultCode?: unknown; status?: unknown } | null;
  const message = typeof err?.message === 'string' ? err.message.trim() : '';
  for (const key of [message, typeof err?.resultCode === 'string' ? err.resultCode : '']) {
    const known = TEXT[key];
    if (known) return l(...known);
  }
  if (err?.status === 403) return l(...DENIED);
  // An unknown code or technical text is never shown raw.
  if (!message || /^[A-Z0-9_]+$/.test(message) || /^[a-zA-Z]+Error\b|Exception|^Failed\.?$|^Request failed/i.test(message)) return fallback ?? l(...GENERIC);
  return message;
}
