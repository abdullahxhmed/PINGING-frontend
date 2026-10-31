export type LanguageCode = 'en' | 'hi' | 'ur' | 'mr';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', dir: 'ltr' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', dir: 'rtl' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', dir: 'ltr' },
];

export interface ContactTranslations {
  // Method titles & subtitles
  call_owner: string;
  number_not_shown: string;
  send_message: string;
  send_message_sub: string;
  report_issue: string;
  report_issue_sub: string;

  // Step 1: Plate verification
  verify_plate: string;
  step_1_of_2: string;
  verify_plate_desc: string;
  checking: string;
  btn_verify: string;
  plate_unlock_note: string;
  plate_verified: string;

  // Step 2: Phone input
  your_mobile_number: string;
  why_need_number_title: string;
  why_need_number_desc: string;
  phone_placeholder: string;
  btn_start_call: string;
  connecting: string;
  privacy_statement: string;
  privacy_sub: string;

  // Active call states
  call_connected: string;
  call_ringing: string;
  call_calling: string;
  call_missed: string;
  call_ended: string;
  private_call: string;
  send_msg_instead: string;
  btn_end_call: string;
  btn_retry: string;
  btn_call_again: string;

  // Note form
  note_for_owner: string;
  message_placeholder: string;
  btn_send_message: string;
  sending: string;
  message_sent: string;
  delivered: string;
  send_another_note: string;
  success_message_sent: string;
  success_alert_sent: (label: string) => string;

  // Issue report options
  choose_an_issue: string;
  alert_blocking_label: string;
  alert_blocking_desc: string;
  alert_lights_label: string;
  alert_lights_desc: string;
  alert_window_label: string;
  alert_window_desc: string;
  alert_alarm_label: string;
  alert_alarm_desc: string;
  alert_tow_label: string;
  alert_tow_desc: string;
  add_note_optional: string;
  note_placeholder: string;
  btn_send_alert: string;

  // Availability
  available: string;
  paused: string;
  tag_paused_title: string;
  tag_paused_desc: string;

  // Disclaimer & Promo
  fair_use_title: string;
  fair_use_desc: string;
  promo_title: string;
  promo_desc: string;
  btn_get_tag: string;
  footer_get_tag: string;
  footer_privacy: string;
}

export const CONTACT_TRANSLATIONS: Record<LanguageCode, ContactTranslations> = {
  en: {
    call_owner: 'Call owner',
    number_not_shown: "Your number isn't shown to them",
    send_message: 'Send a message',
    send_message_sub: 'A short note to the owner',
    report_issue: 'Report an issue',
    report_issue_sub: 'Tell the owner something is wrong with the vehicle',

    verify_plate: 'VERIFY VEHICLE PLATE',
    step_1_of_2: 'STEP 1 OF 2',
    verify_plate_desc: 'Enter the last 4 digits of the vehicle number to unlock call access.',
    checking: 'CHECKING...',
    btn_verify: 'VERIFY →',
    plate_unlock_note: 'Private call unlocks once plate number is confirmed',
    plate_verified: 'Plate Verified',

    your_mobile_number: 'YOUR MOBILE NUMBER',
    why_need_number_title: 'Why do we need your number?',
    why_need_number_desc:
      "It's required to connect the call. The person you're contacting won't see it, and it will not be stored in call log history.",
    phone_placeholder: '10-digit mobile number',
    btn_start_call: 'START PRIVATE CALL',
    connecting: 'CONNECTING...',
    privacy_statement: 'Your number stays private.',
    privacy_sub: "We use it to connect your call and don't store it as part of your Kauntact call history.",

    call_connected: 'Connected',
    call_ringing: 'Ringing...',
    call_calling: 'Calling...',
    call_missed: 'Call missed',
    call_ended: 'Call ended',
    private_call: 'Private call',
    send_msg_instead: 'Send message instead',
    btn_end_call: 'END CALL',
    btn_retry: 'RETRY',
    btn_call_again: 'CALL AGAIN',

    note_for_owner: 'NOTE FOR OWNER',
    message_placeholder: 'e.g. Your lights appear on / please call me back regarding parking bay...',
    btn_send_message: 'SEND MESSAGE',
    sending: 'SENDING...',
    message_sent: 'MESSAGE SENT',
    delivered: 'DELIVERED',
    send_another_note: 'SEND ANOTHER NOTE →',
    success_message_sent: 'Your message has been sent to the owner.',
    success_alert_sent: (label: string) => `Alert "${label}" sent. The owner has been notified.`,

    choose_an_issue: 'CHOOSE AN ISSUE',
    alert_blocking_label: 'Access blocked',
    alert_blocking_desc: 'Vehicle is obstructing passage or driveway',
    alert_lights_label: 'Lights left on',
    alert_lights_desc: 'Headlights or cabin lights appear to be on',
    alert_window_label: 'Window open',
    alert_window_desc: 'Vehicle windows appear unclosed or open',
    alert_alarm_label: 'Alarm sounding',
    alert_alarm_desc: 'Anti-theft or proximity alarm is active',
    alert_tow_label: 'Tow / restricted bay',
    alert_tow_desc: 'Parking enforcement or towing is imminent in this zone',
    add_note_optional: 'ADD A NOTE (OPTIONAL)',
    note_placeholder: 'e.g. Bay 24 or Black SUV',
    btn_send_alert: 'SEND ALERT',

    available: 'Available',
    paused: 'Paused',
    tag_paused_title: 'This QR tag is currently paused by the owner. Calls are temporarily disabled.',
    tag_paused_desc:
      'The owner has temporarily disabled incoming calls and alerts for this tag. Please check back later.',

    fair_use_title: 'Fair use & safety notice',
    fair_use_desc:
      'Calling this tag repeatedly, spamming, or misusing this service will result in your number being permanently blocked and blacklisted by the service. If the owner does not respond, leave a message.',
    promo_title: 'Get your belongings a tag.',
    promo_desc:
      'Give people a way to contact you without displaying your phone number. Waterproof QR stickers for any car or bike.',
    btn_get_tag: 'Get your tag',
    footer_get_tag: 'Get a tag for your own vehicle →',
    footer_privacy: 'Privacy',
  },

  hi: {
    call_owner: 'मालिक को कॉल करें',
    number_not_shown: 'आपका नंबर उन्हें नहीं दिखाया जाएगा',
    send_message: 'संदेश भेजें',
    send_message_sub: 'मालिक के लिए एक छोटा संदेश',
    report_issue: 'समस्या की सूचना दें',
    report_issue_sub: 'मालिक को बताएं कि गाड़ी में कोई समस्या है',

    verify_plate: 'गाड़ी का नंबर सत्यापित करें',
    step_1_of_2: 'चरण 1 / 2',
    verify_plate_desc: 'कॉल शुरू करने के लिए गाड़ी के नंबर के अंतिम 4 अंक दर्ज करें।',
    checking: 'जाँच हो रही है...',
    btn_verify: 'सत्यापित करें →',
    plate_unlock_note: 'नंबर की पुष्टि के बाद प्राइवेट कॉल शुरू होगी',
    plate_verified: 'गाड़ी नंबर सत्यापित',

    your_mobile_number: 'आपका मोबाइल नंबर',
    why_need_number_title: 'हमें आपके नंबर की आवश्यकता क्यों है?',
    why_need_number_desc:
      'कॉल कनेक्ट करने के लिए यह आवश्यक है। गाड़ी मालिक को आपका नंबर नहीं दिखेगा और यह कॉल हिस्ट्री में सेव नहीं होगा।',
    phone_placeholder: '10 अंकों का मोबाइल नंबर',
    btn_start_call: 'प्राइवेट कॉल शुरू करें',
    connecting: 'कॉल कनेक्ट हो रही है...',
    privacy_statement: 'आपका नंबर पूरी तरह सुरक्षित है।',
    privacy_sub: 'हम इसका उपयोग केवल कॉल कनेक्ट करने के लिए करते हैं और इसे सुरक्षित नहीं रखते।',

    call_connected: 'कनेक्टेड',
    call_ringing: 'घंटी जा रही है...',
    call_calling: 'कॉल हो रही है...',
    call_missed: 'कॉल मिस्ड',
    call_ended: 'कॉल समाप्त',
    private_call: 'प्राइवेट कॉल',
    send_msg_instead: 'इसके बजाय संदेश भेजें',
    btn_end_call: 'कॉल काटें',
    btn_retry: 'पुनः प्रयास करें',
    btn_call_again: 'फिर से कॉल करें',

    note_for_owner: 'मालिक के लिए संदेश',
    message_placeholder: 'जैसे: आपकी लाइट्स चालू रह गई हैं / कृपया पार्किंग के बारे में कॉल करें...',
    btn_send_message: 'संदेश भेजें',
    sending: 'भेजा जा रहा है...',
    message_sent: 'संदेश भेजा गया',
    delivered: 'पहुँच गया',
    send_another_note: 'दूसरा संदेश भेजें →',
    success_message_sent: 'आपका संदेश गाड़ी मालिक को भेज दिया गया है।',
    success_alert_sent: (label: string) => `अलर्ट "${label}" भेज दिया गया है। मालिक को सूचित कर दिया गया है।`,

    choose_an_issue: 'समस्या चुनें',
    alert_blocking_label: 'रास्ता रुका हुआ है',
    alert_blocking_desc: 'गाड़ी रास्ते या गेट के सामने खड़ी है',
    alert_lights_label: 'लाइट्स चालू रह गई हैं',
    alert_lights_desc: 'हेडलाइट या केबिन की लाइट चालू है',
    alert_window_label: 'खिड़की खुली है',
    alert_window_desc: 'गाड़ी का शीशा या खिड़की खुली दिख रही है',
    alert_alarm_label: 'अलार्म बज रहा है',
    alert_alarm_desc: 'गाड़ी का सिक्योरिटी अलार्म बज रहा है',
    alert_tow_label: 'नो-पार्किंग / टोइंग का खतरा',
    alert_tow_desc: 'यहाँ गाड़ी पार्क करना मना है, टो हो सकती है',
    add_note_optional: 'कोई नोट जोड़ें (वैकल्पिक)',
    note_placeholder: 'जैसे: बे 24 या काली सेडान',
    btn_send_alert: 'अलर्ट भेजें',

    available: 'उपलब्ध',
    paused: 'रोका हुआ',
    tag_paused_title: 'यह क्यूआर टैग मालिक द्वारा अस्थायी रूप से बंद किया गया है।',
    tag_paused_desc: 'मालिक ने इस टैग के लिए इनकमिंग कॉल और अलर्ट अस्थायी रूप से बंद कर रखे हैं।',

    fair_use_title: 'उचित उपयोग और सुरक्षा सूचना',
    fair_use_desc:
      'इस टैग पर बार-बार कॉल करने, परेशान करने या दुरुपयोग करने पर आपका नंबर हमेशा के लिए ब्लॉक और ब्लैकलिस्ट कर दिया जाएगा। यदि मालिक जवाब न दें, तो कृपया संदेश छोड़ें।',
    promo_title: 'अपनी गाड़ी के लिए टैग प्राप्त करें।',
    promo_desc:
      'अपना फोन नंबर दिखाए बिना लोगों को आपसे संपर्क करने की सुविधा दें। हर कार और बाइक के लिए वाटरप्रूफ क्यूआर स्टिकर।',
    btn_get_tag: 'अपना टैग प्राप्त करें',
    footer_get_tag: 'अपनी गाड़ी के लिए टैग प्राप्त करें →',
    footer_privacy: 'गोपनीयता',
  },

  ur: {
    call_owner: 'گاڑی کے مالک کو کال کریں',
    number_not_shown: 'آپ کا فون نمبر ان کو نظر نہیں آئے گا',
    send_message: 'پیغام بھیجیں',
    send_message_sub: 'مالک کے لیے ایک مختصر پیغام',
    report_issue: 'مسئلے کی اطلاع دیں',
    report_issue_sub: 'مالک کو بتائیں کہ گاڑی میں کوئی خرابی یا مسئلہ ہے',

    verify_plate: 'گاڑی کی نمبر پلیٹ کی تصدیق',
    step_1_of_2: 'مرحلہ ۱ از ۲',
    verify_plate_desc: 'کال کرنے کے لیے گاڑی کے نمبر کے آخری ۴ ہندسے درج کریں۔',
    checking: 'تصدیق ہو رہی ہے...',
    btn_verify: '← تصدیق کریں',
    plate_unlock_note: 'نمبر کی تصدیق کے بعد پرائیویٹ کال شروع ہو سکے گی',
    plate_verified: 'نمبر تصدیق شدہ',

    your_mobile_number: 'آپ کا موبائل نمبر',
    why_need_number_title: 'ہمیں آپ کے نمبر کی ضرورت کیوں ہے؟',
    why_need_number_desc:
      'کال ملانے کے لیے یہ ضروری ہے۔ جسے آپ کال کر رہے ہیں اسے آپ کا نمبر نظر نہیں آئے گا اور نہ ہی یہ ہسٹری میں محفوظ ہوگا۔',
    phone_placeholder: '۱۰ ہندسوں کا موبائل نمبر',
    btn_start_call: 'پرائیویٹ کال شروع کریں',
    connecting: 'کال ملائی جا رہی ہے...',
    privacy_statement: 'آپ کا نمبر بالکل خفیہ رہے گا۔',
    privacy_sub: 'ہم اسے صرف کال ملانے کے لیے استعمال کرتے ہیں اور اسے محفوظ نہیں کرتے۔',

    call_connected: 'کال جڑ گئی',
    call_ringing: 'گھنٹی جا رہی ہے...',
    call_calling: 'کال ملائی جا رہی ہے...',
    call_missed: 'کال مس ہو گئی',
    call_ended: 'کال ختم ہو گئی',
    private_call: 'پرائیویٹ کال',
    send_msg_instead: 'اس کے بجائے میسج بھیجیں',
    btn_end_call: 'کال بند کریں',
    btn_retry: 'دوبارہ ملائیں',
    btn_call_again: 'دوبارہ کال کریں',

    note_for_owner: 'مالک کے لیے پیغام',
    message_placeholder: 'مثلاً: آپ کی لائٹس کھلی ہیں / برائے مہربانی پارکنگ کے بارے میں مجھے کال کریں...',
    btn_send_message: 'پیغام بھیجیں',
    sending: 'بھیجا جا رہا ہے...',
    message_sent: 'پیغام بھیج دیا گیا',
    delivered: 'موصول ہو گیا',
    send_another_note: '← دوسرا پیغام بھیجیں',
    success_message_sent: 'آپ کا پیغام گاڑی کے مالک کو بھیج دیا گیا ہے۔',
    success_alert_sent: (label: string) => `الرٹ "${label}" بھیج دیا گیا ہے۔ مالک کو مطلع کر دیا گیا ہے۔`,

    choose_an_issue: 'مسئلہ منتخب کریں',
    alert_blocking_label: 'راستہ رکا ہوا ہے',
    alert_blocking_desc: 'گاڑی گیٹ یا راستے کے سامنے کھڑی ہے',
    alert_lights_label: 'لائٹس کھلی ہیں',
    alert_lights_desc: 'ہیڈ لائٹس یا اندر کی لائٹ جل رہی ہے',
    alert_window_label: 'کھڑکی کھلی ہے',
    alert_window_desc: 'گاڑی کا شیشہ یا کھڑکی کھلی ہے',
    alert_alarm_label: 'الارم بج رہا ہے',
    alert_alarm_desc: 'گاڑی کا اینٹی تھیفٹ الارم بج رہا ہے',
    alert_tow_label: 'نو پارکنگ / ٹوئنگ زون',
    alert_tow_desc: 'یہاں گاڑی کھڑی کرنا منع ہے، ٹو ہو سکتی ہے',
    add_note_optional: 'کوئی نوٹ شامل کریں (اختیاری)',
    note_placeholder: 'مثلاً: بے ۲۴ یا کالی گاڑی',
    btn_send_alert: 'الرٹ بھیجیں',

    available: 'دستیاب',
    paused: 'روکا ہوا',
    tag_paused_title: 'یہ کیو آر ٹیگ مالک نے عارضی طور پر بند کر رکھا ہے۔',
    tag_paused_desc: 'مالک نے اس ٹیگ کے لیے آنے والی کالز اور الرٹس عارضی طور پر معطل کیے ہیں۔',

    fair_use_title: 'منصفانہ استعمال اور حفاظتی نوٹس',
    fair_use_desc:
      'اس ٹیگ پر بار بار کال کرنے، اسپام کرنے یا پریشان کرنے کی صورت میں آپ کا نمبر ہمیشہ کے لیے بلاک کر دیا جائے گا۔ اگر مالک جواب نہ دیں تو براہ کرم میسج چھوڑ دیں۔',
    promo_title: 'اپنی گاڑی کے لیے ٹیگ حاصل کریں۔',
    promo_desc:
      'اپنا ذاتی فون نمبر ظاہر کیے بغیر لوگوں کو رابطہ کرنے کی سہولت دیں۔ واٹر پروف کیو آر اسٹیکرز۔',
    btn_get_tag: 'اپنا ٹیگ حاصل کریں',
    footer_get_tag: '← اپنی گاڑی کے لیے ٹیگ حاصل کریں',
    footer_privacy: 'پرائیویسی',
  },

  mr: {
    call_owner: 'गाडी मालकाला कॉल करा',
    number_not_shown: 'तुमचा फोन नंबर त्यांना दिसणार नाही',
    send_message: 'मेसेज पाठवा',
    send_message_sub: 'मालकासाठी लहान संदेश',
    report_issue: 'समस्या कळवा',
    report_issue_sub: 'गाडीबाबत काही अडचण असल्यास मालकाला कळवा',

    verify_plate: 'गाडीचा क्रमांक तपासा',
    step_1_of_2: 'पायरी १ / २',
    verify_plate_desc: 'कॉल करण्यासाठी वाहनाच्या नंबरचे शेवटचे ४ अंक टाका.',
    checking: 'तपासत आहे...',
    btn_verify: 'सत्यापित करा →',
    plate_unlock_note: 'नंबरची खात्री झाल्यावर प्रायव्हेट कॉल सुरू होईल',
    plate_verified: 'गाडी क्रमांक सत्यापित',

    your_mobile_number: 'तुमचा मोबाईल नंबर',
    why_need_number_title: 'आम्हाला तुमचा नंबर का आवश्यक आहे?',
    why_need_number_desc:
      'कॉल जोडण्यासाठी हा आवश्यक आहे. तुम्ही ज्यांना कॉल करत आहात त्यांना तुमचा नंबर दिसणार नाही व तो सेव्ह होणार नाही.',
    phone_placeholder: '१० अंकी मोबाईल नंबर',
    btn_start_call: 'प्रायव्हेट कॉल सुरू करा',
    connecting: 'कॉल जोडत आहे...',
    privacy_statement: 'तुमचा नंबर पूर्णपणे सुरक्षित राहील.',
    privacy_sub: 'आम्ही तो फक्त कॉल जोडण्यासाठी वापरतो आणि रेकॉर्डमध्ये ठेवत नाही.',

    call_connected: 'कॉल जोडला',
    call_ringing: 'रिंग होत आहे...',
    call_calling: 'कॉल करत आहे...',
    call_missed: 'कॉल मिस झाला',
    call_ended: 'कॉल समाप्त',
    private_call: 'प्रायव्हेट कॉल',
    send_msg_instead: 'त्याऐवजी मेसेज पाठवा',
    btn_end_call: 'कॉल कट करा',
    btn_retry: 'पुन्हा प्रयत्न करा',
    btn_call_again: 'पुन्हा कॉल करा',

    note_for_owner: 'मालकासाठी मेसेज',
    message_placeholder: 'उदा. तुमच्या गाडीच्या लाईट्स चालू आहेत / कृपया पार्किंगसाठी संपर्क करा...',
    btn_send_message: 'मेसेज पाठवा',
    sending: 'पाठवत आहे...',
    message_sent: 'मेसेज पाठवला',
    delivered: 'पोहोचला',
    send_another_note: 'दुसरा मेसेज पाठवा →',
    success_message_sent: 'तुमचा मेसेज मालकाला पाठवला आहे.',
    success_alert_sent: (label: string) => `अलर्ट "${label}" पाठवला आहे. मालकाला कळवले आहे.`,

    choose_an_issue: 'समस्या निवडा',
    alert_blocking_label: 'रस्ता अडवला आहे',
    alert_blocking_desc: 'गाडी रस्ता किंवा गेटसमोर उभी आहे',
    alert_lights_label: 'लाईट्स चालू आहेत',
    alert_lights_desc: 'हेडलाईट किंवा केबिनची लाईट चालू राहिली आहे',
    alert_window_label: 'खिडकी उघडी आहे',
    alert_window_desc: 'गाडीची खिडकी उघडी दिसत आहे',
    alert_alarm_label: 'अलार्म वाजत आहे',
    alert_alarm_desc: 'गाडीचा सिक्युरिटी अलार्म वाजत आहे',
    alert_tow_label: 'नो-पार्किंग / टोईंगची शक्यता',
    alert_tow_desc: 'इथे गाडी पार्क करण्यास बंदी आहे, टो होऊ शकते',
    add_note_optional: 'टीप जोडा (पर्यायी)',
    note_placeholder: 'उदा. बे २४ किंवा काळी गाडी',
    btn_send_alert: 'अलर्ट पाठवा',

    available: 'उपलब्ध',
    paused: 'थांबवले',
    tag_paused_title: 'हा क्यूआर टॅग मालकाने तात्पुरता बंद ठेवला आहे.',
    tag_paused_desc: 'मालकाने या टॅगसाठी येणारे कॉल्स आणि अलर्ट्स तात्पुरते बंद केले आहेत.',

    fair_use_title: 'सुरक्षा आणि योग्य वापराची सूचना',
    fair_use_desc:
      'वारंवार कॉल करणे किंवा गैरवापर केल्यास तुमचा नंबर कायमचा ब्लॉक केला जाईल. मालकांनी उत्तर न दिल्यास कृपया संदेश पाठवा.',
    promo_title: 'तुमच्या वाहनासाठी टॅग मिळवा.',
    promo_desc:
      'मोबाईल नंबर न दाखवता लोकांशी संपर्क साधण्याची सोय. वॉटरप्रूफ क्यूआर स्टिकर्स.',
    btn_get_tag: 'टॅग मिळवा',
    footer_get_tag: 'तुमच्या स्वतःच्या वाहनासाठी टॅग मिळवा →',
    footer_privacy: 'गोपनीयता',
  },
};
