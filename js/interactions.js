// ═══════════════════════════════════════════════
//  INTERACTIONS — دارجة حقيقية 🇲🇦
// ═══════════════════════════════════════════════

const TAUNTS = [
  "ولد الحشومة يا جاه! 😂",
  "سير دق راسك فالحيط!",
  "ها سكورك — مخزي بصح! 🤦",
  "آش غادي دير بلا عقل؟",
  "مسكين والله — ما شفتش بحالك!",
  "أنا وصلت والعيا تلعب!",
  "راك مع الكبار، سير رقد!",
  "كتلعب بجوجيك ولا بالفارة؟ 😅",
  "هاه — حتى الشيباني يجري عليك!",
  "واش عندك مشكيل مع الكيبورد؟ ⌨️",
  "آش هاد الداعف — 7ta nssa!",
  "والله تشرف الدار تخرج من هنا!",
  "راك ولعت مع خطأ من البداية! 💀",
  "أنا كنلعب بعين واحدة وكنكسبك!",
  "سير تعلم تلعب قبل ما تجي هنا!",
];

const INSULTS = [
  "خلي وعلي يا ولد الشر! 💩",
  "دير الباب من برا — ما كتستاهلش تكون هنا!",
  "ما عندك حتى حشومة — والله صح!",
  "كتلعب بحال اللي ما شاف لعبة فحياتو!",
  "راك مسخرة فهاد الجلسة!",
  "هاد المستوى ديالك — مخزي على ديالك!",
  "سير تدرب سنة وجي من جديد!",
  "ما في راسك حتى حبة رمل من عقل!",
  "تبارك الله — شفت بحالك واحد!",
  "ما شفتش هاكشي فحياتي — بكري حشومة!",
  "حتى الدجاجة تعدو عليك!",
  "كنعيط عليك ولد اللحم — والله!",
  "راك بوتول فهاد الجيم — خرج!",
  "ما تقارنش بيا — مافيش مقارنة!",
  "تعس حظك يا مغفول! 😐",
];

const POLITICAL_TAUNTS = [
  "كيما الحكومة — بزاف كلام وزرو فعل! 🏛️",
  "راك كيما الفيزا ديال أمريكا — ما جيش! 🛂",
  "سكورك كيما l'économie — دايما نازل! 📉",
  "دير بحال المسؤول — خذ رأسك وسير! 😎",
  "كيما الطابور فالقنصلية — ما عمرو ما يخلص!",
  "راك كيما l'embouteillage ديال كازا — محشور وما كتتحرك! 🚗",
  "كيما الصكك — واعد بزاف وما وصل والو!",
  "راك كيما الإصلاح — دايما غد وما جاء! 😅",
];

const PUNISH_MSGS = [
  "قلّ ولا تعدا — جمّد! ❄️",
  "وقف — راسك ما كيفيدك والو! 🔒",
  "مجمّد كيما دماغك! 😈",
  "دير المجلس وما تتحرك! 💀",
  "ها جزاء الداعف — ثلج فوجهك! ☃️",
];

const PARDON_MSGS = [
  "سمحتلك — مو لأنك تستاهل 🤝",
  "هدية منك — حوايج ديال الرحمة!",
  "عفو — ولكن ماعودش! 🎁",
  "خذها — حيت عندك حاجة فيها!",
];

const HELP_MSGS = [
  "🔦 ها نور — حيت راك ضايع!",
  "💡 عطيتك رؤية — دبّر راسك!",
  "ها المساعدة — وإلا ما تستاهلها!",
];

const Interactions = (() => {
  const CD = { punish:8000, pardon:6000, help:10000, taunt:3000 };
  const lastUsed = {};

  function key(who, action) { return `${who}_${action}`; }
  function _cd(action, fast) { return fast ? CD[action]/2 : CD[action]; }
  function canUse(who, action, fast) { return Date.now()-(lastUsed[key(who,action)]||0) >= _cd(action,fast); }
  function use(who, action)    { lastUsed[key(who,action)] = Date.now(); }
  function remaining(who, action) {
    return Math.max(0, Math.ceil((CD[action] - (Date.now()-(lastUsed[key(who,action)]||0)))/1000));
  }
  function rand(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

  function punish(who, fast) {
    if (!canUse(who,'punish',fast)) return { ok:false, cd:remaining(who,'punish') };
    use(who,'punish');
    return { ok:true, action:'punish', msg:rand(PUNISH_MSGS), duration:3500 };
  }
  function pardon(who, fast) {
    if (!canUse(who,'pardon',fast)) return { ok:false, cd:remaining(who,'pardon') };
    use(who,'pardon');
    return { ok:true, action:'pardon', msg:rand(PARDON_MSGS), pts:40 };
  }
  function help(who, fast) {
    if (!canUse(who,'help',fast)) return { ok:false, cd:remaining(who,'help') };
    use(who,'help');
    return { ok:true, action:'help', msg:rand(HELP_MSGS), duration:6000 };
  }
  function taunt(who, fast) {
    if (!canUse(who,'taunt',fast)) return { ok:false, cd:remaining(who,'taunt') };
    use(who,'taunt');
    const r = Math.random();
    const pool = r < 0.4 ? TAUNTS : r < 0.7 ? INSULTS : POLITICAL_TAUNTS;
    return { ok:true, action:'taunt', msg:rand(pool) };
  }

  function resetAll() { Object.keys(lastUsed).forEach(k => delete lastUsed[k]); }

  return { punish, pardon, help, taunt, canUse, remaining, resetAll };
})();
