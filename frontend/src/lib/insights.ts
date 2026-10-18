import type { Lang } from './i18n';

export interface InsightLike {
  code?: string;
  params?: Record<string, string | number>;
  title: string;
  detail: string;
}

type P = Record<string, string | number>;
const s = (v: string | number | undefined) => String(v ?? '');

const TIER_HI: Record<string, string> = {
  'Tier 1 (Metro)': 'टियर 1 (महानगर)',
  'Tier 2 (Emerging Metro)': 'टियर 2 (उभरते महानगर)',
  'Tier 3 (Urban Center)': 'टियर 3 (शहरी केंद्र)',
};

const CONDITION_HI: Record<string, string> = {
  diabetes: 'डायबिटीज़', hypertension: 'हाई ब्लड प्रेशर', heart: 'दिल की बीमारी', thyroid: 'थायरॉइड', asthma: 'अस्थमा', cancer: 'कैंसर के इतिहास',
};
const joinHi = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} और ${items.at(-1)}` : items[0] ?? '');

/** Hindi text for each finding the strategy engine produces, built from the same values as the English. */
const HI: Record<string, (p: P) => { title: string; detail: string }> = {
  life_gap: p => ({
    title: `जीवन बीमा में ${s(p.gap)} की कमी`,
    detail:
      `आपके परिवार को लगभग ${s(p.need)} की ज़रूरत होगी (आय की भरपाई ${s(p.incomeReplacement)}` +
      `${p.partner ? ', जीवनसाथी की आय घटाने के बाद' : ''}, लोन ${s(p.loans)}, पढ़ाई ${s(p.education)}` +
      `${p.savings ? `, ${s(p.savings)} की बचत घटाकर` : ''}), जबकि आपके पास ${s(p.held)} का कवर है। ` +
      `इस कमी के लिए सुझाए गए टर्म प्लान का खर्च लगभग ${s(p.premium)} सालाना है।`,
  }),
  health_gap: p => ({
    title: `स्वास्थ्य बीमा में ${s(p.gap)} की कमी`,
    detail: `${TIER_HI[s(p.cityTier)] ?? s(p.cityTier)} में रहने वाले ${s(p.members)} सदस्यों के परिवार को लगभग ${s(p.recommended)} का अपना स्वास्थ्य बीमा चाहिए; आपके पास ${s(p.held)} है।`,
  }),
  employer_life: () => ({
    title: 'कंपनी का जीवन बीमा साथ नहीं चलता',
    detail: 'ग्रुप टर्म लाइफ़ नौकरी छोड़ते ही खत्म हो जाता है, इसलिए इसे आपके जीवन बीमा कवर में नहीं गिना गया।',
  }),
  employer_health: () => ({
    title: 'कंपनी का स्वास्थ्य बीमा साथ नहीं चलता',
    detail: 'ग्रुप हेल्थ बीमा नौकरी के साथ खत्म हो जाता है और आपके अपने कवर में नहीं गिना जाता। एक व्यक्तिगत पॉलिसी रखें ताकि नौकरी बदलते समय और रिटायरमेंट के बाद भी कवर रहे।',
  }),
  tobacco: () => ({
    title: 'तंबाकू से प्रीमियम बढ़ता है',
    detail: 'तंबाकू लेने वालों का टर्म प्रीमियम लगभग 80% ज़्यादा होता है। 12 महीने या उससे ज़्यादा छोड़ने पर आप धूम्रपान न करने वालों की दर पा सकते हैं।',
  }),
  hobbies: () => ({
    title: 'जोखिम भरे शौक ज़रूर बताएँ',
    detail: 'खतरनाक गतिविधियाँ न बताना क्लेम रिजेक्ट होने की एक आम वजह है; खरीदने से पहले पॉलिसी की शर्तें (एक्सक्लूज़न) देखें।',
  }),
  emergency_fund: p => ({
    title: 'आपातकालीन फ़ंड 6 महीने से कम',
    detail: `${s(p.savings)} की बचत ${s(p.months)} महीने का खर्च चला सकती है। लंबे निवेश से पहले ${s(p.target)} का लक्ष्य रखें; इससे वेटिंग पीरियड और कटौतियों (डिडक्टिबल) का खर्च चलता है जो बीमा नहीं देता।`,
  }),
  expense_ratio: p => ({
    title: 'खर्च का अनुपात ज़्यादा है',
    detail: `रोज़मर्रा का खर्च कुल आय का ${s(p.pct)}% है, जिससे प्रीमियम और बचत के लिए कम पैसा बचता है।`,
  }),
  debt_load: p => ({
    title: 'कर्ज़ का बोझ ज़्यादा है',
    detail: `बकाया लोन सालाना आय के ${s(p.multiple)} गुना हैं। पक्का करें कि जीवन बीमा इन्हें पूरी तरह चुका सके।`,
  }),
  income_protection: p => {
    const parts = [p.ciGap && `गंभीर बीमारी कवर (${s(p.ciGap)} कम)`, p.paGap && `दुर्घटना और विकलांगता कवर (${s(p.paGap)} कम)`].filter(Boolean);
    return {
      title: 'मृत्यु के अलावा आय की सुरक्षा',
      detail: `टर्म बीमा सिर्फ़ मृत्यु पर पैसा देता है और स्वास्थ्य बीमा सिर्फ़ अस्पताल के बिल। ${parts.join(' और ')} पर विचार करें: अगर बीमारी या दुर्घटना से काम छूट जाए तो ये एकमुश्त रकम आय की भरपाई करती हैं।`,
    };
  },
  emi_share: p => ({
    title: `लोन की EMI आय का ${s(p.pct)}% ले रही है`,
    detail: `हर महीने ${s(p.emi)} की EMI उस ${s(p.maxPct)}% सीमा से ज़्यादा है जो ज़्यादातर बैंक मानते हैं। नए लोन से बचें, और टर्म कवर कम से कम बकाया ${s(p.loans)} के बराबर रखें।`,
  }),
  over_income: p => ({
    title: 'खर्च, EMI और प्रीमियम आय से ज़्यादा हैं',
    detail: `सालाना ${s(p.expenses)} खर्च और ${s(p.emis)} EMI के बाद, सुझाए गए ${s(p.premiums)} प्रीमियम से आप ${s(p.short)} कम पड़ेंगे। पहले टर्म बीमा लें और और कवर जोड़ने से पहले खर्च की समीक्षा करें।`,
  }),
  over_budget: p => ({
    title: 'सारी कमियाँ पूरी करना 10% प्रीमियम बजट से ज़्यादा है',
    detail: `अनुमानित ${s(p.premiums)} सालाना, जबकि बजट ${s(p.budget)} है। पहले टर्म बीमा, फिर स्वास्थ्य बीमा को प्राथमिकता दें।`,
  }),
  parents_gap: p => ({
    title: `माता-पिता को ${s(p.gap)} और स्वास्थ्य कवर चाहिए`,
    detail:
      `${Number(p.count) === 1 ? `आपके माता/पिता (उम्र ${s(p.eldest)})` : `आपके ${s(p.count)} माता-पिता (बड़े की उम्र ${s(p.eldest)})`} ` +
      `के लिए लगभग ${s(p.recommended)} की अलग वरिष्ठ नागरिक स्वास्थ्य पॉलिसी होनी चाहिए; उनके पास ${s(p.held)} है। ` +
      `लगभग ${s(p.premium)} सालाना खर्च मानें, और पहले से मौजूद बीमारियों के वेटिंग पीरियड ध्यान से देखें।`,
  }),
  medical: p => {
    const conditions = s(p.conditions).split(',').filter(Boolean).map(c => CONDITION_HI[c] ?? c);
    const declare = joinHi([...conditions, ...(p.bmi ? [`${s(p.bmi)} BMI`] : [])]);
    const pct = Number(p.loadingPct);
    return {
      title: 'अपनी सेहत की पूरी जानकारी दें',
      detail:
        `बीमा कंपनी को अपनी ${declare} के बारे में ज़रूर बताएँ: जानकारी छिपाना क्लेम रिजेक्ट होने की एक बड़ी वजह है, सालों बाद भी। ` +
        `मेडिकल जाँच की उम्मीद रखें${pct > 0 ? ` और टर्म व गंभीर बीमारी कवर का प्रीमियम सामान्य से लगभग ${pct}% ज़्यादा (इन अनुमानों में शामिल)` : ''}।` +
        (Number(p.ped) ? ' नई हेल्थ पॉलिसी इन बीमारियों को 3 साल तक के वेटिंग पीरियड के बाद ही कवर करती है; कुछ प्लान अतिरिक्त प्रीमियम पर इसे घटा देते हैं।' : '') +
        (Number(p.severe) ? ' दिल की बीमारी या कैंसर के इतिहास पर कंपनियाँ कवर टाल या मना कर सकती हैं: एक से ज़्यादा कंपनियों में आवेदन करें, और कंपनी से मिला ग्रुप कवर बनाए रखें।' : ''),
    };
  },
  sole_provider: () => ({
    title: 'आश्रितों के अकेले कमाने वाले',
    detail: 'जीवनसाथी की आय न होने पर, एक अभिभावक (गार्डियन) नामित करें और टर्म प्लान में मासिक आय वाले भुगतान विकल्प पर विचार करें।',
  }),
  on_track: () => ({
    title: 'सुरक्षा सही राह पर है',
    detail: 'आपका कवर अनुमानित ज़रूरत पूरी करता है। हर साल और जीवन की बड़ी घटनाओं के बाद इसकी समीक्षा करें।',
  }),
};

/** The finding in the user's language; falls back to the server's English for unknown codes. */
export function localizeInsight(insight: InsightLike, lang: Lang): { title: string; detail: string } {
  const render = lang === 'hi' && insight.code ? HI[insight.code] : undefined;
  return render ? render(insight.params ?? {}) : { title: insight.title, detail: insight.detail };
}

export const LOCALIZED_INSIGHT_CODES = Object.keys(HI);
