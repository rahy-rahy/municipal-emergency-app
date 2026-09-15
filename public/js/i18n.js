/* Simple internationalisation. Applies text to elements with data-i18n
   and placeholders to elements with data-i18n-ph. Arabic switches to RTL. */
(function () {
  var DICT = {
    en: {
      'app.title': 'Municipal Emergency Reporting',
      'nav.report': 'Report',
      'nav.map': 'Map',
      'nav.feed': 'Town feed',
      'nav.myreports': 'My reports',
      'nav.settings': 'Settings',
      'nav.verify': 'Verification queue',
      'nav.incidents': 'Incident queue',
      'nav.broadcast': 'Send warning',
      'nav.accounts': 'Accounts',
      'nav.audit': 'Audit log',
      'nav.staff': 'Operator tools',
      'nav.admin': 'Admin tools',
      'nav.logout': 'Sign out',

      'common.send': 'Send',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.approve': 'Approve',
      'common.reject': 'Reject',
      'common.back': 'Back',
      'common.loading': 'Loading',
      'common.none': 'Nothing to show yet.',
      'common.note': 'Note',
      'common.optional': 'optional',
      'common.status': 'Status',
      'common.type': 'Type',
      'common.time': 'Time',
      'common.reporter': 'Reporter',
      'common.location': 'Location',

      'login.heading': 'Sign in',
      'login.email': 'Email',
      'login.password': 'Password',
      'login.submit': 'Sign in',
      'login.register': 'Create a resident account',
      'login.tagline': 'Together for a safer community',

      'reg.heading': 'Create your account',
      'reg.name': 'Full name',
      'reg.phone': 'Phone number',
      'reg.step.details': 'Your details',
      'reg.step.phone': 'Confirm your phone',
      'reg.step.id': 'Upload your ID',
      'reg.step.done': 'Waiting for approval',
      'reg.submit': 'Continue',
      'reg.smsprompt': 'Enter the 6 digit code we sent by SMS.',
      'reg.smscode': 'SMS code',
      'reg.idfront': 'ID front',
      'reg.idback': 'ID back',
      'reg.selfie': 'Selfie',
      'reg.idsubmit': 'Submit for review',
      'reg.pending': 'Your account is waiting for an operator to review your ID. You can sign in, but reporting stays locked until you are approved.',

      'report.heading': 'Report an emergency',
      'report.pick': 'Choose what is happening. Your location is added automatically.',
      'report.needhelp': 'I need help',
      'report.imsafe': 'I am safe',
      'report.form.heading': 'Details',
      'report.note.ph': 'Add a short note (what you see, how many people, any danger).',
      'report.photo': 'Photo',
      'report.usemylocation': 'Use my current location',
      'report.locked': 'Your account is not verified yet. You can look around, but reporting is locked until an operator approves you.',
      'report.sent': 'Report sent. Operators can see it now.',

      'type.fire': 'Fire',
      'type.fire.desc': 'Forest, house, vehicle or other fire',
      'type.robbery': 'Robbery or theft',
      'type.robbery.desc': 'Theft, intrusion, suspicious activity',
      'type.flood': 'Flood or hazard',
      'type.flood.desc': 'Flooding, landslide, storm damage',
      'type.electricity': 'Electricity',
      'type.electricity.desc': 'Fallen wires, damaged poles',
      'type.medical': 'Medical',
      'type.medical.desc': 'Injury or ambulance needed',
      'type.other': 'Other',
      'type.other.desc': 'Anything not listed above',

      'status.sent': 'Sent',
      'status.received': 'Received',
      'status.in_progress': 'In progress',
      'status.resolved': 'Resolved',

      'sev.standard': 'Standard',
      'sev.time_sensitive': 'Time sensitive',
      'sev.critical': 'Critical',

      'feed.heading': 'Town feed',
      'feed.none': 'No warnings from the municipality yet.',
      'map.heading': 'Incident map',
      'map.needsinternet': 'The map background needs an internet connection. Incident details still work without it.',

      'myreports.heading': 'My reports',
      'settings.heading': 'Settings',
      'settings.language': 'Language',
      'settings.deaf': 'Deaf and hard of hearing mode',
      'settings.deaf.desc': 'Show large visual alerts and strong vibration instead of relying on sound.',
      'settings.saved': 'Settings saved.',
      'call.heading': 'Call emergency services',
      'call.desc': 'Use these numbers if the internet is down. Confirm them locally before launch.',

      'verify.heading': 'Verification queue',
      'verify.suggested': 'Suggested role',
      'verify.viewid': 'View ID',
      'verify.warnrole': 'This email claims a staff role. Confirm identity in person before approving.',
      'verify.none': 'No signups are waiting for review.',

      'incidents.heading': 'Incident queue',
      'incidents.escalate': 'Escalate to admin',
      'incidents.grouped': 'grouped reports',
      'incidents.none': 'No reports yet.',

      'broadcast.heading': 'Send a town warning',
      'broadcast.message': 'Message',
      'broadcast.message.ph': 'For example: Fire near the upper road, avoid the area.',
      'broadcast.severity': 'Alert level',
      'broadcast.pin': 'Map pin (optional)',
      'broadcast.pinhint': 'Set a location so residents nearby get the alert. Leave empty to warn the whole town.',
      'broadcast.distance': 'Alert radius in km (critical only)',
      'broadcast.setpin': 'Pick a point on the map',
      'broadcast.clearpin': 'Clear pin',
      'broadcast.sent': 'Warning sent to the town.',

      'accounts.heading': 'Accounts',
      'accounts.create': 'Add operator or admin',
      'accounts.role': 'Role',
      'accounts.ban': 'Suspend',
      'accounts.unban': 'Restore',
      'accounts.changerole': 'Change role',

      'audit.heading': 'Audit log',
      'audit.action': 'Action',
      'audit.actor': 'Performed by',
      'audit.detail': 'Detail',

      'demo.reset': 'Reset demo data',
      'demo.resetdone': 'Demo data restored.',

      'role.resident': 'Resident',
      'role.support': 'Operator',
      'role.admin': 'Admin'
    },

    fr: {
      'app.title': 'Signalement des urgences municipales',
      'nav.report': 'Signaler',
      'nav.map': 'Carte',
      'nav.feed': 'Fil de la ville',
      'nav.myreports': 'Mes signalements',
      'nav.settings': 'Paramètres',
      'nav.verify': 'File de vérification',
      'nav.incidents': 'File des incidents',
      'nav.broadcast': 'Envoyer une alerte',
      'nav.accounts': 'Comptes',
      'nav.audit': 'Journal',
      'nav.staff': 'Outils opérateur',
      'nav.admin': 'Outils admin',
      'nav.logout': 'Se déconnecter',

      'common.send': 'Envoyer',
      'common.cancel': 'Annuler',
      'common.save': 'Enregistrer',
      'common.approve': 'Approuver',
      'common.reject': 'Rejeter',
      'common.back': 'Retour',
      'common.loading': 'Chargement',
      'common.none': 'Rien à afficher pour le moment.',
      'common.note': 'Note',
      'common.optional': 'facultatif',
      'common.status': 'Statut',
      'common.type': 'Type',
      'common.time': 'Heure',
      'common.reporter': 'Signalé par',
      'common.location': 'Lieu',

      'login.heading': 'Connexion',
      'login.email': 'Courriel',
      'login.password': 'Mot de passe',
      'login.submit': 'Se connecter',
      'login.register': 'Créer un compte résident',
      'login.tagline': 'Ensemble pour une communauté plus sûre',

      'reg.heading': 'Créer votre compte',
      'reg.name': 'Nom complet',
      'reg.phone': 'Numéro de téléphone',
      'reg.step.details': 'Vos informations',
      'reg.step.phone': 'Confirmez votre téléphone',
      'reg.step.id': 'Téléverser votre pièce',
      'reg.step.done': 'En attente de validation',
      'reg.submit': 'Continuer',
      'reg.smsprompt': 'Entrez le code à 6 chiffres envoyé par SMS.',
      'reg.smscode': 'Code SMS',
      'reg.idfront': 'Pièce, recto',
      'reg.idback': 'Pièce, verso',
      'reg.selfie': 'Photo de vous',
      'reg.idsubmit': 'Envoyer pour révision',
      'reg.pending': 'Votre compte attend la révision de votre pièce par un opérateur. Vous pouvez vous connecter, mais le signalement reste bloqué jusqu à votre approbation.',

      'report.heading': 'Signaler une urgence',
      'report.pick': 'Choisissez ce qui se passe. Votre position est ajoutée automatiquement.',
      'report.needhelp': 'J ai besoin d aide',
      'report.imsafe': 'Je suis en sécurité',
      'report.form.heading': 'Détails',
      'report.note.ph': 'Ajoutez une note courte (ce que vous voyez, combien de personnes, tout danger).',
      'report.photo': 'Photo',
      'report.usemylocation': 'Utiliser ma position actuelle',
      'report.locked': 'Votre compte n est pas encore vérifié. Vous pouvez regarder, mais le signalement est bloqué jusqu à approbation.',
      'report.sent': 'Signalement envoyé. Les opérateurs le voient maintenant.',

      'type.fire': 'Incendie',
      'type.fire.desc': 'Forêt, maison, véhicule ou autre feu',
      'type.robbery': 'Vol ou cambriolage',
      'type.robbery.desc': 'Vol, intrusion, activité suspecte',
      'type.flood': 'Inondation ou danger',
      'type.flood.desc': 'Inondation, glissement, dégâts de tempête',
      'type.electricity': 'Électricité',
      'type.electricity.desc': 'Fils tombés, poteaux endommagés',
      'type.medical': 'Médical',
      'type.medical.desc': 'Blessure ou ambulance nécessaire',
      'type.other': 'Autre',
      'type.other.desc': 'Tout ce qui n est pas listé',

      'status.sent': 'Envoyé',
      'status.received': 'Reçu',
      'status.in_progress': 'En cours',
      'status.resolved': 'Résolu',

      'sev.standard': 'Standard',
      'sev.time_sensitive': 'Urgent',
      'sev.critical': 'Critique',

      'feed.heading': 'Fil de la ville',
      'feed.none': 'Aucune alerte de la municipalité pour l instant.',
      'map.heading': 'Carte des incidents',
      'map.needsinternet': 'Le fond de carte nécessite une connexion internet. Les détails des incidents fonctionnent sans elle.',

      'myreports.heading': 'Mes signalements',
      'settings.heading': 'Paramètres',
      'settings.language': 'Langue',
      'settings.deaf': 'Mode sourd et malentendant',
      'settings.deaf.desc': 'Afficher de grandes alertes visuelles et une forte vibration au lieu du son.',
      'settings.saved': 'Paramètres enregistrés.',
      'call.heading': 'Appeler les secours',
      'call.desc': 'Utilisez ces numéros si internet est coupé. Confirmez les localement avant le lancement.',

      'verify.heading': 'File de vérification',
      'verify.suggested': 'Rôle suggéré',
      'verify.viewid': 'Voir la pièce',
      'verify.warnrole': 'Ce courriel revendique un rôle de personnel. Confirmez l identité en personne avant d approuver.',
      'verify.none': 'Aucune inscription en attente.',

      'incidents.heading': 'File des incidents',
      'incidents.escalate': 'Escalader à l admin',
      'incidents.grouped': 'signalements groupés',
      'incidents.none': 'Aucun signalement.',

      'broadcast.heading': 'Envoyer une alerte à la ville',
      'broadcast.message': 'Message',
      'broadcast.message.ph': 'Par exemple : Incendie près de la route haute, évitez la zone.',
      'broadcast.severity': 'Niveau d alerte',
      'broadcast.pin': 'Point sur la carte (facultatif)',
      'broadcast.pinhint': 'Placez un point pour alerter les résidents proches. Laissez vide pour alerter toute la ville.',
      'broadcast.distance': 'Rayon d alerte en km (critique seulement)',
      'broadcast.setpin': 'Choisir un point sur la carte',
      'broadcast.clearpin': 'Retirer le point',
      'broadcast.sent': 'Alerte envoyée à la ville.',

      'accounts.heading': 'Comptes',
      'accounts.create': 'Ajouter un opérateur ou admin',
      'accounts.role': 'Rôle',
      'accounts.ban': 'Suspendre',
      'accounts.unban': 'Rétablir',
      'accounts.changerole': 'Changer le rôle',

      'audit.heading': 'Journal d audit',
      'audit.action': 'Action',
      'audit.actor': 'Effectué par',
      'audit.detail': 'Détail',

      'demo.reset': 'Réinitialiser les données démo',
      'demo.resetdone': 'Données démo restaurées.',

      'role.resident': 'Résident',
      'role.support': 'Opérateur',
      'role.admin': 'Admin'
    },

    ar: {
      'app.title': 'الإبلاغ عن الطوارئ البلدية',
      'nav.report': 'إبلاغ',
      'nav.map': 'الخريطة',
      'nav.feed': 'أخبار البلدة',
      'nav.myreports': 'بلاغاتي',
      'nav.settings': 'الإعدادات',
      'nav.verify': 'قائمة التحقق',
      'nav.incidents': 'قائمة الحوادث',
      'nav.broadcast': 'إرسال تحذير',
      'nav.accounts': 'الحسابات',
      'nav.audit': 'سجل التدقيق',
      'nav.staff': 'أدوات المشغل',
      'nav.admin': 'أدوات المدير',
      'nav.logout': 'تسجيل الخروج',

      'common.send': 'إرسال',
      'common.cancel': 'إلغاء',
      'common.save': 'حفظ',
      'common.approve': 'قبول',
      'common.reject': 'رفض',
      'common.back': 'رجوع',
      'common.loading': 'جار التحميل',
      'common.none': 'لا يوجد شيء لعرضه بعد.',
      'common.note': 'ملاحظة',
      'common.optional': 'اختياري',
      'common.status': 'الحالة',
      'common.type': 'النوع',
      'common.time': 'الوقت',
      'common.reporter': 'المبلّغ',
      'common.location': 'الموقع',

      'login.heading': 'تسجيل الدخول',
      'login.email': 'البريد الإلكتروني',
      'login.password': 'كلمة المرور',
      'login.submit': 'دخول',
      'login.register': 'إنشاء حساب مقيم',
      'login.tagline': 'معاً من أجل مجتمع أكثر أماناً',

      'reg.heading': 'إنشاء حسابك',
      'reg.name': 'الاسم الكامل',
      'reg.phone': 'رقم الهاتف',
      'reg.step.details': 'بياناتك',
      'reg.step.phone': 'تأكيد هاتفك',
      'reg.step.id': 'رفع الهوية',
      'reg.step.done': 'بانتظار الموافقة',
      'reg.submit': 'متابعة',
      'reg.smsprompt': 'أدخل الرمز المكوّن من ستة أرقام المرسل عبر رسالة نصية.',
      'reg.smscode': 'رمز الرسالة',
      'reg.idfront': 'الهوية، الوجه الأمامي',
      'reg.idback': 'الهوية، الوجه الخلفي',
      'reg.selfie': 'صورة شخصية',
      'reg.idsubmit': 'إرسال للمراجعة',
      'reg.pending': 'حسابك بانتظار مراجعة المشغل لهويتك. يمكنك الدخول، لكن الإبلاغ يبقى مقفلاً حتى الموافقة عليك.',

      'report.heading': 'الإبلاغ عن حالة طوارئ',
      'report.pick': 'اختر ما يحدث. يُضاف موقعك تلقائياً.',
      'report.needhelp': 'أحتاج مساعدة',
      'report.imsafe': 'أنا بأمان',
      'report.form.heading': 'التفاصيل',
      'report.note.ph': 'أضف ملاحظة قصيرة (ما تراه، عدد الأشخاص، أي خطر).',
      'report.photo': 'صورة',
      'report.usemylocation': 'استخدام موقعي الحالي',
      'report.locked': 'حسابك غير مُتحقق بعد. يمكنك التصفح، لكن الإبلاغ مقفل حتى موافقة المشغل.',
      'report.sent': 'تم إرسال البلاغ. يستطيع المشغلون رؤيته الآن.',

      'type.fire': 'حريق',
      'type.fire.desc': 'حريق غابة أو منزل أو مركبة أو غيره',
      'type.robbery': 'سرقة أو سطو',
      'type.robbery.desc': 'سرقة، اقتحام، نشاط مريب',
      'type.flood': 'فيضان أو خطر',
      'type.flood.desc': 'فيضان، انزلاق، أضرار عاصفة',
      'type.electricity': 'كهرباء',
      'type.electricity.desc': 'أسلاك ساقطة، أعمدة متضررة',
      'type.medical': 'طبي',
      'type.medical.desc': 'إصابة أو حاجة لإسعاف',
      'type.other': 'أخرى',
      'type.other.desc': 'أي شيء غير مذكور أعلاه',

      'status.sent': 'مُرسل',
      'status.received': 'مُستلم',
      'status.in_progress': 'قيد المعالجة',
      'status.resolved': 'تم الحل',

      'sev.standard': 'عادي',
      'sev.time_sensitive': 'عاجل',
      'sev.critical': 'حرج',

      'feed.heading': 'أخبار البلدة',
      'feed.none': 'لا توجد تحذيرات من البلدية بعد.',
      'map.heading': 'خريطة الحوادث',
      'map.needsinternet': 'خلفية الخريطة تحتاج اتصالاً بالإنترنت. تفاصيل الحوادث تعمل بدونه.',

      'myreports.heading': 'بلاغاتي',
      'settings.heading': 'الإعدادات',
      'settings.language': 'اللغة',
      'settings.deaf': 'وضع الصم وضعاف السمع',
      'settings.deaf.desc': 'عرض تنبيهات بصرية كبيرة واهتزاز قوي بدل الاعتماد على الصوت.',
      'settings.saved': 'تم حفظ الإعدادات.',
      'call.heading': 'الاتصال بخدمات الطوارئ',
      'call.desc': 'استخدم هذه الأرقام إذا انقطع الإنترنت. تأكد منها محلياً قبل الإطلاق.',

      'verify.heading': 'قائمة التحقق',
      'verify.suggested': 'الدور المقترح',
      'verify.viewid': 'عرض الهوية',
      'verify.warnrole': 'هذا البريد يدّعي دوراً وظيفياً. تأكد من الهوية شخصياً قبل القبول.',
      'verify.none': 'لا تسجيلات بانتظار المراجعة.',

      'incidents.heading': 'قائمة الحوادث',
      'incidents.escalate': 'تصعيد للمدير',
      'incidents.grouped': 'بلاغات مجمّعة',
      'incidents.none': 'لا بلاغات بعد.',

      'broadcast.heading': 'إرسال تحذير للبلدة',
      'broadcast.message': 'الرسالة',
      'broadcast.message.ph': 'مثال: حريق قرب الطريق العلوي، تجنبوا المنطقة.',
      'broadcast.severity': 'مستوى التنبيه',
      'broadcast.pin': 'نقطة على الخريطة (اختياري)',
      'broadcast.pinhint': 'حدد موقعاً لتنبيه المقيمين القريبين. اتركه فارغاً لتحذير كامل البلدة.',
      'broadcast.distance': 'نطاق التنبيه بالكيلومتر (للحرج فقط)',
      'broadcast.setpin': 'اختر نقطة على الخريطة',
      'broadcast.clearpin': 'إزالة النقطة',
      'broadcast.sent': 'أُرسل التحذير إلى البلدة.',

      'accounts.heading': 'الحسابات',
      'accounts.create': 'إضافة مشغل أو مدير',
      'accounts.role': 'الدور',
      'accounts.ban': 'إيقاف',
      'accounts.unban': 'استعادة',
      'accounts.changerole': 'تغيير الدور',

      'audit.heading': 'سجل التدقيق',
      'audit.action': 'الإجراء',
      'audit.actor': 'قام به',
      'audit.detail': 'التفاصيل',

      'demo.reset': 'إعادة ضبط بيانات العرض',
      'demo.resetdone': 'تمت استعادة بيانات العرض.',

      'role.resident': 'مقيم',
      'role.support': 'مشغل',
      'role.admin': 'مدير'
    }
  };

  var lang = localStorage.getItem('lang') || 'en';
  if (!DICT[lang]) lang = 'en';

  function t(key) {
    return (DICT[lang] && DICT[lang][key]) || (DICT.en[key]) || key;
  }

  function apply(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    }
    var phs = scope.querySelectorAll('[data-i18n-ph]');
    for (var j = 0; j < phs.length; j++) {
      phs[j].setAttribute('placeholder', t(phs[j].getAttribute('data-i18n-ph')));
    }
  }

  function setLang(next) {
    if (!DICT[next]) return;
    lang = next;
    localStorage.setItem('lang', next);
    document.documentElement.setAttribute('lang', next);
    document.body.setAttribute('dir', next === 'ar' ? 'rtl' : 'ltr');
    apply(document);
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: next } }));
  }

  window.I18N = { t: t, apply: apply, setLang: setLang, get lang() { return lang; } };

  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.setAttribute('lang', lang);
    document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    apply(document);
  });
})();
