/** Arabic language pack */
export const ar: Record<string, string> = {
  // ── MENU ──
  'menu.title': 'REALM WARS',
  'menu.subtitle': 'حرب الممالك',
  'menu.newGame': 'لعبة جديدة',
  'menu.continue': 'متابعة',
  'menu.settings': 'الإعدادات',
  'menu.back': 'رجوع',
  'menu.version': 'v1.0.0',

  // ── SETUP ──
  'setup.title': 'لعبة جديدة',
  'setup.playerName': 'اسم القائد',
  'setup.playerNamePlaceholder': 'أدخل اسمك...',
  'setup.botCount': 'عدد الخصوم',
  'setup.mapSize': 'حجم الخريطة',
  'setup.mapSmall': 'صغير',
  'setup.mapMedium': 'متوسط',
  'setup.mapLarge': 'كبير',
  'setup.difficulty': 'الصعوبة',
  'setup.easy': 'سهل',
  'setup.normal': 'عادي',
  'setup.hard': 'صعب',
  'setup.easyDesc': 'للمبتدئين',
  'setup.normalDesc': 'مغامرة متوازنة',
  'setup.hardDesc': 'للمحترفين',
  'setup.seedLabel': 'رمز الخريطة (اختياري)',
  'setup.seedPlaceholder': 'اتركه فارغاً = عشوائي',
  'setup.seedHint': 'اللاعبون الذين يستخدمون نفس الرمز يحصلون على نفس الخريطة.',
  'setup.paste': 'لصق',
  'setup.start': 'ابدأ الحملة',
  'setup.invalidSeed': 'رمز غير صالح',
  'setup.invalidSeedMsg': 'يجب أن يكون الرمز رقماً موجباً.',

  // ── GAME SCREEN ──
  'game.endTurn': 'إنهاء الدور',
  'game.moveHint': 'انقر على الخلية المستهدفة',
  'game.save': 'حفظ',
  'game.research': 'بحث',
  'game.hero': 'بطل',
  'game.diplo': 'دبلوماسية',
  'game.exitTitle': 'مغادرة اللعبة',
  'game.exitMsg': 'سيضيع التقدم غير المحفوظ. هل أنت متأكد؟',
  'game.cancel': 'إلغاء',
  'game.saveAndExit': 'حفظ والخروج',
  'game.exit': 'خروج',
  'game.saved': 'تم الحفظ',
  'game.savedMsg': 'تم حفظ اللعبة بنجاح.',

  // ── TOOLBAR ──
  'toolbar.turn': 'الدور',
  'toolbar.seed': 'الرمز',
  'toolbar.seedCopied': 'تم النسخ',
  'toolbar.seedCopiedMsg': 'تم نسخ رمز الخريطة ({seed}) إلى الحافظة.',

  // ── TURN BANNER ──
  'turn.label': 'الدور {n}',

  // ── FEEDBACK ──
  'feedback.victory': 'نصر!',
  'feedback.defeat': 'هزيمة!',
  'feedback.built': 'تم بناء المبنى!',
  'feedback.trained': 'تم تدريب الوحدة!',

  // ── BUILD MODAL ──
  'build.title': 'بناء',
  'build.close': 'إغلاق',
  'build.cantBuild': 'لا يمكن البناء هنا',
  'build.production': 'الإنتاج:',
  'build.perTurn': '+{val}/دور',

  // ── BUILDING NAMES ──
  'building.castle': 'قلعة',
  'building.barracks': 'ثكنة',
  'building.mine': 'منجم',
  'building.farm': 'مزرعة',
  'building.lumbermill': 'منشرة',
  'building.tower': 'برج',
  'building.market': 'سوق',

  // ── TRAIN MODAL ──
  'train.title': 'تدريب وحدة',
  'train.close': 'إغلاق',
  'train.train': 'تدريب',

  // ── UNIT NAMES ──
  'unit.warrior': 'محارب',
  'unit.archer': 'رامي',
  'unit.cavalry': 'فارس',
  'unit.catapult': 'منجنيق',
  'unit.scout': 'كشاف',

  // ── UNIT DESCRIPTIONS ──
  'unit.warrior.desc': 'مشاة متوازنة',
  'unit.archer.desc': 'هجوم عالي، دفاع منخفض',
  'unit.cavalry.desc': 'سريع وقوي',
  'unit.catapult.desc': 'مدمر مباني، بطيء',
  'unit.scout.desc': 'مدى رؤية واسع',

  // ── HEX INFO ──
  'hex.army': 'جيش',
  'hex.power': 'القوة: {val}',
  'hex.build': 'بناء',
  'hex.train': 'تدريب',
  'hex.upgrade': 'ترقية',
  'hex.move': 'تحريك الجيش',
  'hex.max': 'حد أقصى',
  'hex.defense': '% دفاع',

  // ── TECH TREE ──
  'tech.title': 'شجرة التقنية',
  'tech.close': 'إغلاق',
  'tech.level': 'المستوى {n}',
  'tech.done': 'مكتمل',
  'tech.turns': '{n} أدوار',
  'tech.remaining': '{n} أدوار متبقية',

  // ── HERO ──
  'hero.title': 'الأبطال',
  'hero.close': 'إغلاق',
  'hero.myHeroes': 'أبطالي',
  'hero.unassign': 'إلغاء التعيين',
  'hero.assign': 'تعيين',
  'hero.hire': 'توظيف',
  'hero.owned': 'مملوك',
  'hero.cooldown': '{n} أدوار',

  // ── DIPLOMACY ──
  'diplo.title': 'الدبلوماسية',
  'diplo.close': 'إغلاق',
  'diplo.proposals': 'العروض الواردة',
  'diplo.alliance': 'تحالف',
  'diplo.nonAggression': 'عدم اعتداء',
  'diplo.offer': '{name} يعرض {action}',
  'diplo.accept': 'قبول',
  'diplo.reject': 'رفض',
  'diplo.relations': 'العلاقات',
  'diplo.neutral': 'محايد',
  'diplo.war': 'حرب',
  'diplo.tribute': 'جزية (50 ذهب)',
  'diplo.noRivals': 'لا خصوم متبقين.',
  'diplo.declareWarTitle': 'إعلان حرب',
  'diplo.declareWarMsg': 'هل أنت متأكد من إعلان الحرب على {name}؟',
  'diplo.declareWarBtn': 'حرب!',

  // ── EVENT ──
  'event.ok': 'حسناً',
  'event.units': 'الوحدات: {val}%',

  // ── WEATHER ──
  'weather.turnsLeft': '{n} أدوار متبقية',
  'weather.moveCost': 'تكلفة الحركة',
  'weather.attack': 'الهجوم',
  'weather.defense': 'الدفاع',
  'weather.visibility': 'مدى الرؤية',
  'weather.foodProd': 'إنتاج الغذاء',
  'weather.ok': 'حسناً',

  // ── BATTLE RESULT ──
  'battle.victory': 'نصر!',
  'battle.defeat': 'هزيمة!',
  'battle.attacker': 'المهاجم',
  'battle.defender': 'المدافع',
  'battle.loss': 'الخسارة: {pct}%',
  'battle.surviving': 'الوحدات الباقية:',
  'battle.destroyed': 'دُمرت بالكامل',
  'battle.buildingDmg': 'ضرر المبنى: {val} نقطة',
  'battle.ok': 'حسناً',

  // ── VICTORY PROGRESS ──
  'victory.title': 'تقدم النصر',
  'victory.collapse': 'طي',
  'victory.castles': 'القلاع المدمرة',
  'victory.economic': '{gold}/{goldReq} ذهب، {territory}/{territoryReq} أرض',
  'victory.tech': '{done}/{total} تقنية',
  'victory.domination': '{territory}/{required} خلية',

  // ── GAME OVER ──
  'gameover.rankings': 'الترتيب',
  'gameover.victory': 'نصر!',
  'gameover.winner': '{name} فاز!',
  'gameover.draw': 'تعادل',
  'gameover.totalTurns': 'مجموع الأدوار',
  'gameover.players': 'اللاعبون',
  'gameover.map': 'الخريطة',
  'gameover.bot': 'آلي',
  'gameover.eliminated': 'مُقصى',
  'gameover.winnerBadge': 'الفائز',
  'gameover.mainMenu': 'القائمة الرئيسية',
  'gameover.territory': 'الأراضي',
  'gameover.buildings': 'المباني',
  'gameover.units': 'الوحدات',
  'gameover.power': 'القوة',
  'gameover.resources': 'الموارد',
  'gameover.techStat': 'التقنية',
  'gameover.production': 'الإنتاج',
  'gameover.heroes': 'الأبطال',

  // ── TUTORIAL ──
  'tutorial.skip': 'تخطي',
  'tutorial.back': 'رجوع',
  'tutorial.next': 'التالي',
  'tutorial.start': 'ابدأ!',
  'tutorial.tip': 'نصيحة',
  'tutorial.step': '{current} / {total}',

  'tutorial.0.title': 'مرحباً بك في مملكتك!',
  'tutorial.0.text': 'تبدأ بقلعة وجيش صغير. هدفك توسيع مملكتك وهزيمة خصومك.',
  'tutorial.0.tip': 'اسحب للتنقل في الخريطة، واستخدم القرص للتكبير والتصغير.',

  'tutorial.1.title': 'توسيع الأراضي',
  'tutorial.1.text': 'اختر جيشك وانقله إلى الخلايا المجاورة لغزو أراضٍ جديدة. كل أرض توفر لك موارد.',
  'tutorial.1.tip': 'انقر على خلية واضغط "تحريك الجيش"، ثم انقر على الخلية المستهدفة.',

  'tutorial.2.title': 'بناء المنشآت',
  'tutorial.2.text': 'ابنِ على الخلايا الفارغة في أراضيك:\n• مزرعة = غذاء\n• منجم = حديد وحجر\n• منشرة = خشب\n• سوق = ذهب',
  'tutorial.2.tip': 'التضاريس المختلفة تسمح بمبانٍ مختلفة. الجبال للمناجم، الغابات للخشب!',

  'tutorial.3.title': 'تدريب الوحدات',
  'tutorial.3.text': 'انقر على قلعتك واستخدم "تدريب" لإنتاج جنود. هناك 5 أنواع من الوحدات، لكل منها قدرات فريدة.',
  'tutorial.3.tip': 'المحاربون + الكشافة كافون في البداية. ابحث عن تقنيات للرماة والفرسان.',

  'tutorial.4.title': 'البحث العلمي',
  'tutorial.4.text': 'استخدم زر "بحث" في الشريط لاكتشاف تقنيات جديدة. افتح وحدات ومبانٍ ومكافآت جديدة.',
  'tutorial.4.tip': 'ننصح بـ"الرماية" أو "الزراعة" كأول بحث.',

  'tutorial.5.title': 'توظيف الأبطال',
  'tutorial.5.text': 'الأبطال يمنحون مكافآت خاصة لجيشك. استخدم "بطل" في الشريط لتوظيفهم وتعيينهم.',
  'tutorial.5.tip': 'خاقان ممتاز للهجوم، أرسلان مثالي للدفاع.',

  'tutorial.6.title': 'الدبلوماسية',
  'tutorial.6.text': 'يمكنك إبرام اتفاقيات عدم اعتداء أو تحالفات أو إرسال جزية لخصومك.',
  'tutorial.6.tip': 'القتال على جبهتين محفوف بالمخاطر! اصنع السلام مع خصم وركز على الآخر.',

  'tutorial.7.title': 'طرق النصر',
  'tutorial.7.text': 'يمكنك الفوز بـ4 طرق:\n• عسكري: دمر كل القلاع\n• اقتصادي: 1000 ذهب + 20 أرض\n• تقني: ابحث كل التقنيات\n• هيمنة: سيطر على 60% من الخريطة',
  'tutorial.7.tip': 'تابع شريط التقدم في الأسفل. ركز على أقرب نصر!',

  // ── SETTINGS ──
  'settings.title': 'الإعدادات',
  'settings.back': 'رجوع',
  'settings.sound': 'الصوت والاهتزاز',
  'settings.haptic': 'الاهتزاز',
  'settings.hapticDesc': 'ردود فعل الأزرار والإجراءات',
  'settings.soundFx': 'المؤثرات الصوتية',
  'settings.soundFxDesc': 'أصوات المعارك والبناء والأدوار',
  'settings.map': 'الخريطة',
  'settings.defaultSize': 'الحجم الافتراضي',
  'settings.difficultySection': 'الصعوبة',
  'settings.defaultDifficulty': 'صعوبة الخصم الافتراضية',
  'settings.visual': 'المظهر',
  'settings.animSpeed': 'سرعة الرسوم المتحركة',
  'settings.slow': 'بطيء',
  'settings.fast': 'سريع',
  'settings.hexGrid': 'شبكة الخلايا',
  'settings.hexGridDesc': 'إظهار حواف الخلايا',
  'settings.fogOfWar': 'ضباب الحرب',
  'settings.fogOfWarDesc': 'ضباب الحرب تشغيل/إيقاف',
  'settings.gameSection': 'اللعبة',
  'settings.autoEndTurn': 'إنهاء الدور تلقائياً',
  'settings.autoEndTurnDesc': 'إنهاء الدور عند عدم وجود إجراءات',
  'settings.dataSection': 'البيانات',
  'settings.savedGame': 'اللعبة المحفوظة',
  'settings.saveExists': 'توجد لعبة محفوظة',
  'settings.noSave': 'لا توجد لعبة محفوظة',
  'settings.delete': 'حذف',
  'settings.resetAll': 'إعادة تعيين جميع الإعدادات',
  'settings.language': 'اللغة',
  'settings.selectLang': 'اختر اللغة',

  // ── TERRAIN NAMES ──
  'terrain.plains': 'سهول',
  'terrain.mountain': 'جبل',
  'terrain.forest': 'غابة',
  'terrain.river': 'نهر',
  'terrain.desert': 'صحراء',
  'terrain.swamp': 'مستنقع',
};
