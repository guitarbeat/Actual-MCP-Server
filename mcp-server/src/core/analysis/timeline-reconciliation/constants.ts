export const TIMELINE_ANALYSIS_VERSION = 1;
export const RECON_START_DATE = '2025-08-01';
export const RECON_END_DATE = '2026-03-26';
export const TIMELINE_RECON_AUDIT_FILENAME = 'timeline-recon-audit.json';
export const TIMELINE_RECON_CANDIDATES_FILENAME = 'timeline-recon-candidates.csv';
export const TIMELINE_RECON_MANUAL_REVIEW_FILENAME = 'timeline-recon-manual-review.csv';
export const TIMELINE_PLACE_CACHE_FILENAME = 'timeline-place-cache.json';
export const TIMELINE_CATEGORY_OVERRIDES_FILENAME = 'timeline-category-overrides.json';
export const SUPPLEMENTAL_TRANSACTIONS_FILENAME = '2026-03-26 23_17_40-transactions.csv';
export const LOCATION_HISTORY_FILENAME = 'location-history.json';
export const TIMELINE_NOTE_PREFIX = '[Timeline] ';
export const MIN_PSEUDO_STAY_MINUTES = 30;
export const MAX_PSEUDO_STAY_CLUSTER_DISTANCE_METERS = 150;
export const EXACT_MATCH_SHORT_TEXT_LENGTH = 5;
export const MIN_HISTORICAL_HINT_COUNT = 2;
export const MIN_HISTORICAL_HINT_CONFIDENCE = 0.75;
export const MIN_RULE_CONFIRMATION_COUNT = 2;

export const FAST_FOOD_KEYWORDS = [
  'taco',
  'burger',
  'pizza',
  'donut',
  'coffee',
  'tea',
  'boba',
  'ice cream',
  'frozen yogurt',
  'yogurt',
  'smoothie',
  'juice',
  'popeyes',
  'taco bell',
  'mcdonald',
  'wendy',
  'chipotle',
  'starbucks',
  'tim hortons',
  'happy lemon',
];

export const DINING_KEYWORDS = [
  'restaurant',
  'bar',
  'cafe',
  'grill',
  'cantina',
  'kitchen',
  'beer garden',
  'food truck',
  'bakery',
];

export const GAS_KEYWORDS = [
  'gas',
  'fuel',
  'shell',
  'chevron',
  'exxon',
  'murphy',
  'valero',
  'love',
  'stop',
  'convenience',
  'travel stop',
  'arco',
  '76',
  'select stop',
];

export const RIDESHARE_KEYWORDS = ['uber', 'lyft', 'transit', 'metro', 'parking', 'toll', 'lime'];

export const HOUSEHOLD_KEYWORDS = [
  'hardware',
  'home depot',
  'lowe',
  'ace',
  'ikea',
  'furniture',
  'world market',
  'detergent',
  'cleaner',
  'household',
  'paper towels',
  'toilet paper',
];

export const PET_KEYWORDS = ['pretty litter', 'litter', 'cat', 'pet', 'vet', 'dog', 'aquacatsusa'];
export const BEAUTY_KEYWORDS = ['beauty', 'salon', 'cosmetic', 'skin', 'hair', 'makeup', 'spa'];
export const MEDICINE_KEYWORDS = ['pharmacy', 'medical', 'medicine', 'clinic', 'urgent care', 'drug'];
export const HEALTH_INSURANCE_KEYWORDS = ['healthplan', 'insurance', 'health plan'];
export const INVESTMENT_KEYWORDS = ['robinhood', 'kalshi', 'broker', 'stock', 'crypto', 'investment'];
export const FEE_KEYWORDS = ['fee', 'interest', 'late fee', 'returned payment', 'payment returned'];
export const GOVERNMENT_KEYWORDS = [
  'department',
  'dmv',
  'clerk',
  'county',
  'state',
  'city',
  'office',
  'permit',
  'tax',
  'public safety',
];
export const EXPERIENCE_KEYWORDS = [
  'venue',
  'music',
  'concert',
  'theater',
  'museum',
  'festival',
  'club',
  'lounge',
  'stage',
  'cinema',
  'gallery',
];
export const HOME_GOODS_KEYWORDS = ['furnishing', 'decor', 'home good', 'appliance', 'houseware'];
export const SHOPPING_KEYWORDS = [
  'market',
  'store',
  'shop',
  'boutique',
  'mall',
  'retail',
  'target',
  'ross',
  'crocs',
];
export const TECH_KEYWORDS = ['electronic', 'tech', 'apple store', 'best buy', 'oculus'];

export const INELIGIBLE_MERCHANT_PATTERNS = [
  'payment',
  'bill payment',
  'automatic payment',
  'credit card payment',
  'balance transfer',
  'transfer',
  'to chase',
  'venmo',
  'zelle',
  'cash app',
  'apple cash',
  'alipay',
  'statebankin',
  'facebooktec',
  'pyl',
  'housing',
  'autopay',
  'statement',
  'ba electronic payment',
];

export const EXTERNAL_CATEGORY_ALIASES: Record<string, string> = {
  groceries: 'ðŸ›’ Groceries',
  shopping: 'ðŸ›ï¸ Shopping / Marketplace',
  entertainment: 'ðŸŽ­ Experiences',
  'personal care': 'ðŸ§´ Personal Care & Beauty',
  'travel vacation': 'âœˆï¸ One-Off / Travel',
};
