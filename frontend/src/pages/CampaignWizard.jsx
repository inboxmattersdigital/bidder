import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Check, Save, Megaphone, Target, DollarSign, Image, Settings, 
  ChevronRight, Loader2, Users, Clock, Shield, BarChart3, Globe, 
  Smartphone, Monitor, Tv, Radio, MapPin, Calendar, Lightbulb, Sparkles,
  FileText, Layers, Plus, Trash2, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Slider } from "../components/ui/slider";
import { Checkbox } from "../components/ui/checkbox";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../components/ui/select";
import { toast } from "sonner";
import { 
  createCampaign, updateCampaign, getCampaign, getCreatives,
  getReferenceData, getMediaPlanForecast, recommendCampaignStrategy
} from "../lib/api";

// ==================== CONSTANTS ====================

const STEPS = [
  { id: 1, key: "overview", title: "Campaign overview", icon: Megaphone },
  { id: 2, key: "budget", title: "Budget & bidding", icon: DollarSign },
  { id: 3, key: "targeting", title: "Targeting", icon: Target },
  { id: 4, key: "audience", title: "Audience", icon: Users },
  { id: 5, key: "creatives", title: "Creatives", icon: Image },
  { id: 6, key: "schedule", title: "Schedule & pacing", icon: Clock },
  { id: 7, key: "io_lineitems", title: "IO & Line Items", icon: Layers },
  { id: 8, key: "safety", title: "Brand safety", icon: Shield },
  { id: 9, key: "measurement", title: "Measurement", icon: BarChart3 },
];

const LINE_ITEM_TYPES = [
  { value: "prospecting", label: "Prospecting", color: "#3B82F6", desc: "New user acquisition" },
  { value: "retargeting", label: "Retargeting", color: "#10B981", desc: "Re-engage visitors" },
  { value: "contextual", label: "Contextual", color: "#F59E0B", desc: "Content-based targeting" },
  { value: "audience", label: "Audience", color: "#8B5CF6", desc: "Segment-based targeting" },
  { value: "lookalike", label: "Lookalike", color: "#EC4899", desc: "Similar audience expansion" },
];

const IO_STRUCTURE_TYPES = [
  { value: "audience", label: "By Audience", desc: "Organize by audience segments" },
  { value: "tactic", label: "By Tactic", desc: "Organize by marketing tactics" },
  { value: "goal", label: "By Goal", desc: "Organize by campaign objectives" },
];

const CAMPAIGN_GOALS = [
  { value: "brand_awareness", label: "Brand Awareness", desc: "Increase visibility" },
  { value: "reach", label: "Reach", desc: "Maximize unique users" },
  { value: "traffic", label: "Traffic", desc: "Drive website visits" },
  { value: "engagement", label: "Engagement", desc: "Increase interactions" },
  { value: "app_installs", label: "App Installs", desc: "Drive app downloads" },
  { value: "video_views", label: "Video Views", desc: "Maximize video consumption" },
  { value: "lead_generation", label: "Lead Generation", desc: "Collect leads" },
  { value: "conversions", label: "Conversions", desc: "Drive purchases/actions" },
];

const KPI_TYPES = [
  { value: "cpm", label: "CPM", desc: "Cost per 1,000 impressions" },
  { value: "cpc", label: "CPC", desc: "Cost per click" },
  { value: "cpa", label: "CPA", desc: "Cost per acquisition" },
  { value: "cpv", label: "CPV", desc: "Cost per view" },
  { value: "vcpm", label: "vCPM", desc: "Viewable CPM" },
  { value: "roas", label: "ROAS", desc: "Return on ad spend" },
];

const BIDDING_STRATEGIES = [
  { value: "manual_cpm", label: "Manual CPM", desc: "Set your own CPM bid" },
  { value: "manual_cpc", label: "Manual CPC", desc: "Set your own CPC bid" },
  { value: "target_cpa", label: "Target CPA", desc: "Optimize for conversions" },
  { value: "target_roas", label: "Target ROAS", desc: "Optimize for return" },
  { value: "maximize_conversions", label: "Maximize Conversions", desc: "Auto-optimize for conversions" },
  { value: "maximize_clicks", label: "Maximize Clicks", desc: "Auto-optimize for clicks" },
];

const INVENTORY_SOURCES = [
  { value: "open_exchange", label: "Open Exchange", icon: Globe, desc: "Programmatic open market" },
  { value: "pmp", label: "Private Marketplace", icon: Shield, desc: "Curated deals" },
  { value: "pg", label: "Programmatic Guaranteed", icon: Check, desc: "Reserved inventory" },
  { value: "youtube", label: "YouTube", icon: Tv, desc: "Video ads on YouTube" },
  { value: "gdn", label: "Google Display Network", icon: Monitor, desc: "Display across Google" },
  { value: "ctv", label: "Connected TV", icon: Tv, desc: "Streaming TV ads" },
  { value: "audio", label: "Audio", icon: Radio, desc: "Podcast & streaming audio" },
];

const ENVIRONMENTS = [
  { value: "web", label: "Web", icon: Monitor },
  { value: "app", label: "Mobile App", icon: Smartphone },
  { value: "ctv", label: "Connected TV", icon: Tv },
  { value: "dooh", label: "Digital Out-of-Home", icon: MapPin },
];

const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const GENDERS = ["male", "female", "unknown"];
const INCOME_SEGMENTS = ["low", "medium", "high", "affluent"];
const LANGUAGES = [
  { code: "en", name: "English" }, { code: "es", name: "Spanish" },
  { code: "fr", name: "French" }, { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" }, { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" }, { code: "ko", name: "Korean" },
  { code: "hi", name: "Hindi" }, { code: "ar", name: "Arabic" },
];

const BRAND_SAFETY_LEVELS = [
  { value: "standard", label: "Standard", desc: "Basic brand safety" },
  { value: "strict", label: "Strict", desc: "Enhanced protection" },
  { value: "custom", label: "Custom", desc: "Define your own rules" },
];

const COUNTRIES = [
  // Middle East
  { code: "ARE", name: "United Arab Emirates" }, { code: "SAU", name: "Saudi Arabia" },
  { code: "QAT", name: "Qatar" }, { code: "KWT", name: "Kuwait" },
  { code: "BHR", name: "Bahrain" }, { code: "OMN", name: "Oman" },
  // North America
  { code: "USA", name: "United States" }, { code: "CAN", name: "Canada" },
  { code: "MEX", name: "Mexico" },
  // Europe
  { code: "GBR", name: "United Kingdom" }, { code: "DEU", name: "Germany" },
  { code: "FRA", name: "France" }, { code: "ITA", name: "Italy" },
  { code: "ESP", name: "Spain" }, { code: "NLD", name: "Netherlands" },
  { code: "BEL", name: "Belgium" }, { code: "CHE", name: "Switzerland" },
  { code: "AUT", name: "Austria" }, { code: "SWE", name: "Sweden" },
  { code: "NOR", name: "Norway" }, { code: "DNK", name: "Denmark" },
  { code: "FIN", name: "Finland" }, { code: "POL", name: "Poland" },
  { code: "PRT", name: "Portugal" }, { code: "IRL", name: "Ireland" },
  { code: "CZE", name: "Czech Republic" }, { code: "ROU", name: "Romania" },
  { code: "HUN", name: "Hungary" }, { code: "GRC", name: "Greece" },
  // Asia Pacific
  { code: "IND", name: "India" }, { code: "CHN", name: "China" },
  { code: "JPN", name: "Japan" }, { code: "KOR", name: "South Korea" },
  { code: "SGP", name: "Singapore" }, { code: "MYS", name: "Malaysia" },
  { code: "THA", name: "Thailand" }, { code: "VNM", name: "Vietnam" },
  { code: "IDN", name: "Indonesia" }, { code: "PHL", name: "Philippines" },
  { code: "AUS", name: "Australia" }, { code: "NZL", name: "New Zealand" },
  { code: "HKG", name: "Hong Kong" }, { code: "TWN", name: "Taiwan" },
  { code: "PAK", name: "Pakistan" }, { code: "BGD", name: "Bangladesh" },
  // South America
  { code: "BRA", name: "Brazil" }, { code: "ARG", name: "Argentina" },
  { code: "COL", name: "Colombia" }, { code: "CHL", name: "Chile" },
  { code: "PER", name: "Peru" }, { code: "VEN", name: "Venezuela" },
  // Africa
  { code: "ZAF", name: "South Africa" }, { code: "EGY", name: "Egypt" },
  { code: "NGA", name: "Nigeria" }, { code: "KEN", name: "Kenya" },
  { code: "MAR", name: "Morocco" },
  // Others
  { code: "RUS", name: "Russia" }, { code: "TUR", name: "Turkey" },
  { code: "ISR", name: "Israel" },
];

// States by Country
const STATES_BY_COUNTRY = {
  USA: [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming"
  ],
  IND: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir"
  ],
  ARE: ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"],
  GBR: ["England", "Scotland", "Wales", "Northern Ireland"],
  CAN: ["Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba", "Saskatchewan"],
  AUS: ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia"],
  DEU: ["Bavaria", "Berlin", "Hamburg", "Hesse", "North Rhine-Westphalia", "Baden-Württemberg"],
};

// Cities by Country
const CITIES_BY_COUNTRY = {
  USA: [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio",
    "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville", "Fort Worth", "Columbus",
    "Charlotte", "San Francisco", "Indianapolis", "Seattle", "Denver", "Washington DC",
    "Boston", "Nashville", "Detroit", "Portland", "Las Vegas", "Memphis", "Louisville",
    "Baltimore", "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Sacramento", "Atlanta", "Miami"
  ],
  IND: [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Pune",
    "Surat", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal",
    "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik",
    "Faridabad", "Meerut", "Rajkot", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad",
    "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur",
    "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Chandigarh", "Guwahati"
  ],
  ARE: [
    "Dubai", "Abu Dhabi", "Sharjah", "Al Ain", "Ajman", "Ras Al Khaimah", "Fujairah",
    "Umm Al Quwain", "Khor Fakkan", "Dibba Al-Fujairah", "Kalba"
  ],
  GBR: [
    "London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Leeds", "Sheffield",
    "Edinburgh", "Bristol", "Leicester", "Coventry", "Bradford", "Cardiff", "Belfast",
    "Nottingham", "Kingston upon Hull", "Newcastle", "Stoke-on-Trent", "Southampton"
  ],
  CAN: [
    "Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg",
    "Quebec City", "Hamilton", "Kitchener", "London", "Victoria", "Halifax", "Oshawa"
  ],
  AUS: [
    "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra",
    "Newcastle", "Wollongong", "Logan City", "Geelong", "Hobart", "Townsville", "Cairns"
  ],
  DEU: [
    "Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf",
    "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden", "Hanover", "Nuremberg"
  ],
  SAU: ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Tabuk", "Buraidah"],
  QAT: ["Doha", "Al Wakrah", "Al Khor", "Umm Salal Muhammad"],
  SGP: ["Singapore"],
  FRA: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Bordeaux"],
  JPN: ["Tokyo", "Yokohama", "Osaka", "Nagoya", "Sapporo", "Kobe", "Kyoto", "Fukuoka"],
  CHN: ["Shanghai", "Beijing", "Shenzhen", "Guangzhou", "Chengdu", "Hangzhou", "Wuhan", "Xian"],
  BRA: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte"],
};

// Telecom Operators by Country
const TELECOM_OPERATORS = {
  USA: ["AT&T", "Verizon", "T-Mobile", "Sprint", "US Cellular", "Dish Network"],
  IND: ["Jio", "Airtel", "Vi (Vodafone Idea)", "BSNL", "MTNL"],
  ARE: ["Etisalat", "du"],
  GBR: ["EE", "O2", "Vodafone UK", "Three UK", "Virgin Mobile UK"],
  CAN: ["Rogers", "Bell", "Telus", "Freedom Mobile", "Sasktel"],
  AUS: ["Telstra", "Optus", "Vodafone AU", "TPG"],
  DEU: ["Deutsche Telekom", "Vodafone DE", "O2 Germany", "1&1"],
  SAU: ["STC", "Mobily", "Zain"],
  QAT: ["Ooredoo", "Vodafone Qatar"],
  SGP: ["Singtel", "StarHub", "M1", "TPG Telecom"],
  FRA: ["Orange", "SFR", "Bouygues Telecom", "Free Mobile"],
  JPN: ["NTT Docomo", "au by KDDI", "SoftBank", "Rakuten Mobile"],
  CHN: ["China Mobile", "China Unicom", "China Telecom"],
  BRA: ["Vivo", "Claro", "TIM", "Oi"],
};

// IAB Categories
const IAB_CATEGORIES = [
  { code: "IAB1", name: "Arts & Entertainment" },
  { code: "IAB1-1", name: "Books & Literature" },
  { code: "IAB1-2", name: "Celebrity Fan/Gossip" },
  { code: "IAB1-3", name: "Fine Art" },
  { code: "IAB1-4", name: "Humor" },
  { code: "IAB1-5", name: "Movies" },
  { code: "IAB1-6", name: "Music" },
  { code: "IAB1-7", name: "Television" },
  { code: "IAB2", name: "Automotive" },
  { code: "IAB2-1", name: "Auto Parts" },
  { code: "IAB2-2", name: "Auto Repair" },
  { code: "IAB2-3", name: "Buying/Selling Cars" },
  { code: "IAB3", name: "Business" },
  { code: "IAB3-1", name: "Advertising" },
  { code: "IAB3-2", name: "Agriculture" },
  { code: "IAB3-3", name: "Biotech/Biomedical" },
  { code: "IAB3-4", name: "Business Software" },
  { code: "IAB3-5", name: "Construction" },
  { code: "IAB3-6", name: "Forestry" },
  { code: "IAB3-7", name: "Government" },
  { code: "IAB3-8", name: "Green Solutions" },
  { code: "IAB3-9", name: "Human Resources" },
  { code: "IAB3-10", name: "Logistics" },
  { code: "IAB3-11", name: "Marketing" },
  { code: "IAB3-12", name: "Metals" },
  { code: "IAB4", name: "Careers" },
  { code: "IAB4-1", name: "Career Planning" },
  { code: "IAB4-2", name: "College" },
  { code: "IAB4-3", name: "Financial Aid" },
  { code: "IAB4-4", name: "Job Fairs" },
  { code: "IAB4-5", name: "Job Search" },
  { code: "IAB4-6", name: "Resume Writing/Advice" },
  { code: "IAB4-7", name: "Nursing" },
  { code: "IAB4-8", name: "Scholarships" },
  { code: "IAB4-9", name: "Telecommuting" },
  { code: "IAB4-10", name: "U.S. Military" },
  { code: "IAB4-11", name: "Career Advice" },
  { code: "IAB5", name: "Education" },
  { code: "IAB5-1", name: "7-12 Education" },
  { code: "IAB5-2", name: "Adult Education" },
  { code: "IAB5-3", name: "Art History" },
  { code: "IAB5-4", name: "College Administration" },
  { code: "IAB5-5", name: "College Life" },
  { code: "IAB5-6", name: "Distance Learning" },
  { code: "IAB5-7", name: "English as a 2nd Language" },
  { code: "IAB5-8", name: "Language Learning" },
  { code: "IAB5-9", name: "Graduate School" },
  { code: "IAB5-10", name: "Homeschooling" },
  { code: "IAB5-11", name: "Homework/Study Tips" },
  { code: "IAB5-12", name: "K-6 Educators" },
  { code: "IAB5-13", name: "Private School" },
  { code: "IAB5-14", name: "Special Education" },
  { code: "IAB5-15", name: "Studying Business" },
  { code: "IAB6", name: "Family & Parenting" },
  { code: "IAB6-1", name: "Adoption" },
  { code: "IAB6-2", name: "Babies & Toddlers" },
  { code: "IAB6-3", name: "Daycare/Pre School" },
  { code: "IAB6-4", name: "Family Internet" },
  { code: "IAB6-5", name: "Parenting - K-6 Kids" },
  { code: "IAB6-6", name: "Parenting teens" },
  { code: "IAB6-7", name: "Pregnancy" },
  { code: "IAB6-8", name: "Special Needs Kids" },
  { code: "IAB6-9", name: "Eldercare" },
  { code: "IAB7", name: "Health & Fitness" },
  { code: "IAB7-1", name: "Exercise" },
  { code: "IAB7-2", name: "ADD" },
  { code: "IAB7-3", name: "AIDS/HIV" },
  { code: "IAB7-4", name: "Allergies" },
  { code: "IAB7-5", name: "Alternative Medicine" },
  { code: "IAB7-6", name: "Arthritis" },
  { code: "IAB7-7", name: "Asthma" },
  { code: "IAB7-8", name: "Autism/PDD" },
  { code: "IAB7-9", name: "Bipolar Disorder" },
  { code: "IAB7-10", name: "Brain Tumor" },
  { code: "IAB7-11", name: "Cancer" },
  { code: "IAB7-12", name: "Cholesterol" },
  { code: "IAB7-13", name: "Chronic Fatigue Syndrome" },
  { code: "IAB7-14", name: "Chronic Pain" },
  { code: "IAB7-15", name: "Cold & Flu" },
  { code: "IAB7-16", name: "Deafness" },
  { code: "IAB7-17", name: "Dental Care" },
  { code: "IAB7-18", name: "Depression" },
  { code: "IAB7-19", name: "Dermatology" },
  { code: "IAB7-20", name: "Diabetes" },
  { code: "IAB7-21", name: "Epilepsy" },
  { code: "IAB7-22", name: "GERD/Acid Reflux" },
  { code: "IAB7-23", name: "Headaches/Migraines" },
  { code: "IAB7-24", name: "Heart Disease" },
  { code: "IAB7-25", name: "Herbs for Health" },
  { code: "IAB7-26", name: "Holistic Healing" },
  { code: "IAB7-27", name: "IBS/Crohn's Disease" },
  { code: "IAB7-28", name: "Incest/Abuse Support" },
  { code: "IAB7-29", name: "Incontinence" },
  { code: "IAB7-30", name: "Infertility" },
  { code: "IAB7-31", name: "Men's Health" },
  { code: "IAB7-32", name: "Nutrition" },
  { code: "IAB7-33", name: "Orthopedics" },
  { code: "IAB7-34", name: "Panic/Anxiety Disorders" },
  { code: "IAB7-35", name: "Pediatrics" },
  { code: "IAB7-36", name: "Physical Therapy" },
  { code: "IAB7-37", name: "Psychology/Psychiatry" },
  { code: "IAB7-38", name: "Senior Health" },
  { code: "IAB7-39", name: "Sexuality" },
  { code: "IAB7-40", name: "Sleep Disorders" },
  { code: "IAB7-41", name: "Smoking Cessation" },
  { code: "IAB7-42", name: "Substance Abuse" },
  { code: "IAB7-43", name: "Thyroid Disease" },
  { code: "IAB7-44", name: "Weight Loss" },
  { code: "IAB7-45", name: "Women's Health" },
  { code: "IAB8", name: "Food & Drink" },
  { code: "IAB8-1", name: "American Cuisine" },
  { code: "IAB8-2", name: "Barbecues & Grilling" },
  { code: "IAB8-3", name: "Cajun/Creole" },
  { code: "IAB8-4", name: "Chinese Cuisine" },
  { code: "IAB8-5", name: "Cocktails/Beer" },
  { code: "IAB8-6", name: "Coffee/Tea" },
  { code: "IAB8-7", name: "Cuisine-Specific" },
  { code: "IAB8-8", name: "Desserts & Baking" },
  { code: "IAB8-9", name: "Dining Out" },
  { code: "IAB8-10", name: "Food Allergies" },
  { code: "IAB8-11", name: "French Cuisine" },
  { code: "IAB8-12", name: "Health/Lowfat Cooking" },
  { code: "IAB8-13", name: "Italian Cuisine" },
  { code: "IAB8-14", name: "Japanese Cuisine" },
  { code: "IAB8-15", name: "Mexican Cuisine" },
  { code: "IAB8-16", name: "Vegan" },
  { code: "IAB8-17", name: "Vegetarian" },
  { code: "IAB8-18", name: "Wine" },
  { code: "IAB9", name: "Hobbies & Interests" },
  { code: "IAB9-1", name: "Art/Technology" },
  { code: "IAB9-2", name: "Arts & Crafts" },
  { code: "IAB9-3", name: "Beadwork" },
  { code: "IAB9-4", name: "Bird-Watching" },
  { code: "IAB9-5", name: "Board Games/Puzzles" },
  { code: "IAB9-6", name: "Candle & Soap Making" },
  { code: "IAB9-7", name: "Card Games" },
  { code: "IAB9-8", name: "Chess" },
  { code: "IAB9-9", name: "Cigars" },
  { code: "IAB9-10", name: "Collecting" },
  { code: "IAB9-11", name: "Comic Books" },
  { code: "IAB9-12", name: "Drawing/Sketching" },
  { code: "IAB9-13", name: "Freelance Writing" },
  { code: "IAB9-14", name: "Genealogy" },
  { code: "IAB9-15", name: "Getting Published" },
  { code: "IAB9-16", name: "Guitar" },
  { code: "IAB9-17", name: "Home Recording" },
  { code: "IAB9-18", name: "Investors & Patents" },
  { code: "IAB9-19", name: "Jewelry Making" },
  { code: "IAB9-20", name: "Magic & Illusion" },
  { code: "IAB9-21", name: "Needlework" },
  { code: "IAB9-22", name: "Painting" },
  { code: "IAB9-23", name: "Photography" },
  { code: "IAB9-24", name: "Radio" },
  { code: "IAB9-25", name: "Roleplaying Games" },
  { code: "IAB9-26", name: "Sci-Fi & Fantasy" },
  { code: "IAB9-27", name: "Scrapbooking" },
  { code: "IAB9-28", name: "Screenwriting" },
  { code: "IAB9-29", name: "Stamps & Coins" },
  { code: "IAB9-30", name: "Video & Computer Games" },
  { code: "IAB9-31", name: "Woodworking" },
  { code: "IAB10", name: "Home & Garden" },
  { code: "IAB11", name: "Law, Gov't & Politics" },
  { code: "IAB12", name: "News" },
  { code: "IAB13", name: "Personal Finance" },
  { code: "IAB13-1", name: "Beginning Investing" },
  { code: "IAB13-2", name: "Credit/Debt & Loans" },
  { code: "IAB13-3", name: "Financial News" },
  { code: "IAB13-4", name: "Financial Planning" },
  { code: "IAB13-5", name: "Hedge Fund" },
  { code: "IAB13-6", name: "Insurance" },
  { code: "IAB13-7", name: "Investing" },
  { code: "IAB13-8", name: "Mutual Funds" },
  { code: "IAB13-9", name: "Options" },
  { code: "IAB13-10", name: "Retirement Planning" },
  { code: "IAB13-11", name: "Stocks" },
  { code: "IAB13-12", name: "Tax Planning" },
  { code: "IAB14", name: "Society" },
  { code: "IAB15", name: "Science" },
  { code: "IAB16", name: "Pets" },
  { code: "IAB17", name: "Sports" },
  { code: "IAB17-1", name: "Auto Racing" },
  { code: "IAB17-2", name: "Baseball" },
  { code: "IAB17-3", name: "Bicycling" },
  { code: "IAB17-4", name: "Bodybuilding" },
  { code: "IAB17-5", name: "Boxing" },
  { code: "IAB17-6", name: "Canoeing/Kayaking" },
  { code: "IAB17-7", name: "Cheerleading" },
  { code: "IAB17-8", name: "Climbing" },
  { code: "IAB17-9", name: "Cricket" },
  { code: "IAB17-10", name: "Figure Skating" },
  { code: "IAB17-11", name: "Fly Fishing" },
  { code: "IAB17-12", name: "Football" },
  { code: "IAB17-13", name: "Freshwater Fishing" },
  { code: "IAB17-14", name: "Game & Fish" },
  { code: "IAB17-15", name: "Golf" },
  { code: "IAB17-16", name: "Horse Racing" },
  { code: "IAB17-17", name: "Horses" },
  { code: "IAB17-18", name: "Hunting/Shooting" },
  { code: "IAB17-19", name: "Inline Skating" },
  { code: "IAB17-20", name: "Martial Arts" },
  { code: "IAB17-21", name: "Mountain Biking" },
  { code: "IAB17-22", name: "NASCAR Racing" },
  { code: "IAB17-23", name: "Olympics" },
  { code: "IAB17-24", name: "Paintball" },
  { code: "IAB17-25", name: "Power & Motorcycles" },
  { code: "IAB17-26", name: "Pro Basketball" },
  { code: "IAB17-27", name: "Pro Ice Hockey" },
  { code: "IAB17-28", name: "Rodeo" },
  { code: "IAB17-29", name: "Rugby" },
  { code: "IAB17-30", name: "Running/Jogging" },
  { code: "IAB17-31", name: "Sailing" },
  { code: "IAB17-32", name: "Saltwater Fishing" },
  { code: "IAB17-33", name: "Scuba Diving" },
  { code: "IAB17-34", name: "Skateboarding" },
  { code: "IAB17-35", name: "Skiing" },
  { code: "IAB17-36", name: "Snowboarding" },
  { code: "IAB17-37", name: "Surfing/Bodyboarding" },
  { code: "IAB17-38", name: "Swimming" },
  { code: "IAB17-39", name: "Table Tennis/Ping-Pong" },
  { code: "IAB17-40", name: "Tennis" },
  { code: "IAB17-41", name: "Volleyball" },
  { code: "IAB17-42", name: "Walking" },
  { code: "IAB17-43", name: "Waterski/Wakeboard" },
  { code: "IAB17-44", name: "World Soccer" },
  { code: "IAB18", name: "Style & Fashion" },
  { code: "IAB19", name: "Technology & Computing" },
  { code: "IAB19-1", name: "3-D Graphics" },
  { code: "IAB19-2", name: "Animation" },
  { code: "IAB19-3", name: "Antivirus Software" },
  { code: "IAB19-4", name: "C/C++" },
  { code: "IAB19-5", name: "Cameras & Camcorders" },
  { code: "IAB19-6", name: "Cell Phones" },
  { code: "IAB19-7", name: "Computer Certification" },
  { code: "IAB19-8", name: "Computer Networking" },
  { code: "IAB19-9", name: "Computer Peripherals" },
  { code: "IAB19-10", name: "Computer Reviews" },
  { code: "IAB19-11", name: "Data Centers" },
  { code: "IAB19-12", name: "Databases" },
  { code: "IAB19-13", name: "Desktop Publishing" },
  { code: "IAB19-14", name: "Desktop Video" },
  { code: "IAB19-15", name: "Email" },
  { code: "IAB19-16", name: "Graphics Software" },
  { code: "IAB19-17", name: "Home Video/DVD" },
  { code: "IAB19-18", name: "Internet Technology" },
  { code: "IAB19-19", name: "Java" },
  { code: "IAB19-20", name: "JavaScript" },
  { code: "IAB19-21", name: "Mac Support" },
  { code: "IAB19-22", name: "MP3/MIDI" },
  { code: "IAB19-23", name: "Net Conferencing" },
  { code: "IAB19-24", name: "Net for Beginners" },
  { code: "IAB19-25", name: "Network Security" },
  { code: "IAB19-26", name: "Palmtops/PDAs" },
  { code: "IAB19-27", name: "PC Support" },
  { code: "IAB19-28", name: "Portable" },
  { code: "IAB19-29", name: "Entertainment" },
  { code: "IAB19-30", name: "Shareware/Freeware" },
  { code: "IAB19-31", name: "Software" },
  { code: "IAB19-32", name: "Web Clip Art" },
  { code: "IAB19-33", name: "Web Design/HTML" },
  { code: "IAB19-34", name: "Web Search" },
  { code: "IAB19-35", name: "Windows" },
  { code: "IAB20", name: "Travel" },
  { code: "IAB21", name: "Real Estate" },
  { code: "IAB22", name: "Shopping" },
  { code: "IAB23", name: "Religion & Spirituality" },
];

const CURRENCIES = [
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
];

const BID_PRICING_TYPES = [
  { value: "cpm", label: "CPM", desc: "Cost per 1,000 impressions" },
  { value: "cpc", label: "CPC", desc: "Cost per click" },
  { value: "cpa", label: "CPA", desc: "Cost per acquisition" },
  { value: "cpv", label: "CPV", desc: "Cost per view" },
];

const DEVICE_TYPES = [
  { id: 1, name: "Mobile/Tablet" }, { id: 2, name: "Desktop" },
  { id: 3, name: "Connected TV" }, { id: 4, name: "Phone" },
  { id: 5, name: "Tablet" }, { id: 7, name: "Set Top Box" },
];

const OS_LIST = ["Android", "iOS", "Windows", "macOS", "Linux", "Chrome OS", "tvOS", "Roku", "Fire OS"];
const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge", "Samsung Internet", "Opera"];
const CONNECTION_TYPES = ["wifi", "4g", "5g", "3g", "ethernet"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ATTRIBUTION_MODELS = [
  { value: "last_touch", label: "Last Touch", desc: "Credit last interaction" },
  { value: "first_touch", label: "First Touch", desc: "Credit first interaction" },
  { value: "linear", label: "Linear", desc: "Equal credit to all" },
  { value: "time_decay", label: "Time Decay", desc: "More credit to recent" },
  { value: "position_based", label: "Position Based", desc: "40/20/40 split" },
];

// ==================== MAIN COMPONENT ====================

export default function CampaignWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  // Check if we're creating from media plan
  const fromMediaPlan = location.state?.fromMediaPlan;
  const planData = location.state?.planData;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatives, setCreatives] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [strategyRec, setStrategyRec] = useState(null);
  const [showPlanBanner, setShowPlanBanner] = useState(fromMediaPlan);
  
  // ==================== FORM STATE ====================
  const [form, setForm] = useState({
    // Campaign Overview
    name: "",
    iab_categories: [],
    description: "",
    primary_goal: "brand_awareness",
    kpi_type: "cpm",
    kpi_target: 5.0,
    
    // Budget & Bidding
    bidding_strategy: "manual_cpm",
    bid_pricing_type: "cpm",
    bid_floor: 0.5,
    currency: "USD",
    daily_budget: 100,
    total_budget: 3000,
    pacing_type: "even",
    
    // Inventory
    inventory_sources: ["open_exchange"],
    environments: ["web", "app"],
    
    // Geographic Targeting
    geo_countries: [],
    geo_states: [],
    geo_cities: [],
    geo_pincodes: [],
    lat_long_targeting: false,
    lat_long_points: [],
    geo_latitude: "",
    geo_longitude: "",
    radius_km: 10,
    
    // Telecom
    telecom_operators: [],
    
    // Device Targeting
    device_types: [],
    os_list: [],
    browsers: [],
    carriers: [],
    connection_types: [],
    
    // Demographics
    age_ranges: [],
    genders: [],
    income_segments: [],
    languages: [],
    
    // Contextual Targeting
    contextual_keywords: [],
    contextual_categories: [],
    keyword_match_type: "broad",
    
    // Placement & Viewability
    ad_positions: [],
    viewability_threshold: 50,
    exclude_non_viewable: false,
    
    // Time Targeting
    time_targeting_enabled: false,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    hours_of_day: Array.from({ length: 24 }, (_, i) => i),
    timezone: "UTC",
    
    // Brand Safety
    brand_safety_level: "standard",
    blocked_categories: [],
    blocked_keywords: [],
    blocked_domains: [],
    exclude_ugc: false,
    exclude_live_streaming: false,
    
    // Audience
    first_party_audiences: [],
    third_party_audiences: [],
    first_party_audience_input: "",
    third_party_audience_input: "",
    lookalike_enabled: false,
    lookalike_expansion: 3,
    audience_exclusions: [],
    
    // Creatives
    creative_id: "",
    creative_ids: [],
    
    // Schedule
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    
    // Frequency
    frequency_cap_enabled: false,
    frequency_cap_count: 5,
    frequency_cap_period: "day",
    
    // Insertion Order & Line Items
    io_enabled: false,
    io_name: "",
    io_structure_type: "audience",
    line_items: [],
    
    // Advanced
    priority: 5,
    bid_shading_enabled: false,
    ml_prediction_enabled: false,
    spo_enabled: false,
    
    // Measurement
    conversion_tracking_enabled: false,
    conversion_pixel_id: "",
    attribution_model: "last_touch",
    click_through_window: 30,
    view_through_window: 1,
  });

  // ==================== EFFECTS ====================
  
  useEffect(() => {
    loadInitialData();
  }, [id]);

  // Apply media plan data if coming from planner
  useEffect(() => {
    if (fromMediaPlan && planData && !isEdit) {
      setForm(prev => ({
        ...prev,
        // Budget
        total_budget: planData.total_budget || prev.total_budget,
        daily_budget: planData.daily_budget || prev.daily_budget,
        
        // Goal & Strategy
        primary_goal: planData.primary_goal || prev.primary_goal,
        kpi_type: planData.kpi_type || prev.kpi_type,
        bidding_strategy: planData.bidding_strategy || prev.bidding_strategy,
        pacing_type: planData.pacing_type || prev.pacing_type,
        
        // Frequency Cap
        frequency_cap_enabled: planData.frequency_cap_enabled ?? prev.frequency_cap_enabled,
        frequency_cap_count: planData.frequency_cap_count || prev.frequency_cap_count,
        frequency_cap_period: planData.frequency_cap_period || prev.frequency_cap_period,
        
        // Inventory Sources
        inventory_sources: planData.inventory_sources || prev.inventory_sources,
      }));
      
      // Set forecast from plan data
      if (planData.forecast) {
        setForecast({
          estimated_impressions: planData.forecast.impressions,
          estimated_reach: planData.forecast.reach,
          estimated_clicks: planData.forecast.clicks,
          estimated_cpm: planData.forecast.cpm,
          confidence_level: planData.forecast.confidence
        });
      }
      
      // Mark budget step as potentially complete
      setCompletedSteps(prev => new Set([...prev, 2]));
      
      toast.success("Media plan settings applied!");
    }
  }, [fromMediaPlan, planData, isEdit]);

  useEffect(() => {
    // Generate forecast when budget/targeting changes
    if (form.total_budget > 0 && form.primary_goal) {
      generateForecast();
    }
  }, [form.total_budget, form.daily_budget, form.primary_goal, form.inventory_sources]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const creativesRes = await getCreatives();
      setCreatives(creativesRes.data || []);
      
      if (id) {
        const campaignRes = await getCampaign(id);
        const c = campaignRes.data;
        
        setForm(prev => ({
          ...prev,
          name: c.name || "",
          business_product: c.business_product || "",
          description: c.description || "",
          primary_goal: c.primary_goal || "brand_awareness",
          kpi_type: c.kpi_type || "cpm",
          bid_price: c.bid_price || 2.0,
          bid_floor: c.bid_floor || 0.5,
          currency: c.currency || "USD",
          daily_budget: c.budget?.daily_budget || 100,
          total_budget: c.budget?.total_budget || 3000,
          pacing_type: c.budget?.pacing_type || "even",
          inventory_sources: c.inventory_sources || ["open_exchange"],
          environments: c.environments || ["web", "app"],
          geo_countries: c.targeting?.geo?.countries || [],
          device_types: c.targeting?.device?.device_types || [],
          os_list: c.targeting?.device?.os_list || [],
          creative_id: c.creative_id || "",
          start_date: c.start_date?.split('T')[0] || "",
          end_date: c.end_date?.split('T')[0] || "",
          frequency_cap_enabled: c.frequency_cap?.enabled || false,
          frequency_cap_count: c.frequency_cap?.max_impressions || 5,
          frequency_cap_period: c.frequency_cap?.period || "day",
          priority: c.priority || 5,
          bid_shading_enabled: c.bid_shading?.enabled || false,
          ml_prediction_enabled: c.ml_prediction?.enabled || false,
          // Demographics
          age_ranges: c.targeting?.demographics?.age_ranges || [],
          genders: c.targeting?.demographics?.genders || [],
          income_segments: c.targeting?.demographics?.income_segments || [],
          languages: c.targeting?.demographics?.languages || [],
          // Brand Safety
          brand_safety_level: c.targeting?.brand_safety?.level || "standard",
          blocked_categories: c.targeting?.brand_safety?.blocked_categories || [],
          // Time targeting
          time_targeting_enabled: c.targeting?.time?.enabled || false,
          days_of_week: c.targeting?.time?.days_of_week || [0,1,2,3,4,5,6],
          hours_of_day: c.targeting?.time?.hours_of_day || Array.from({length: 24}, (_,i) => i),
        }));
        
        setCompletedSteps(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const generateForecast = async () => {
    try {
      const durationDays = form.end_date && form.start_date
        ? Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24))
        : 30;
      
      const res = await getMediaPlanForecast({
        budget: form.total_budget || form.daily_budget * durationDays,
        duration_days: durationDays,
        goal: form.primary_goal,
        inventory_sources: form.inventory_sources,
        creative_types: form.creative_id ? ["display"] : ["display"],
        targeting: {
          geo: { countries: form.geo_countries },
          device: { device_types: form.device_types },
          demographics: { age_ranges: form.age_ranges, genders: form.genders }
        }
      });
      setForecast(res.data);
    } catch (err) {
      // Silent fail for forecast
    }
  };

  const getStrategyRecommendation = async () => {
    try {
      const durationDays = form.end_date && form.start_date
        ? Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24))
        : 30;
      
      const res = await recommendCampaignStrategy(
        form.primary_goal, 
        form.total_budget || form.daily_budget * durationDays,
        durationDays,
        ["display"]
      );
      setStrategyRec(res.data);
      toast.success("Strategy recommendation loaded");
    } catch (err) {
      toast.error("Failed to get recommendations");
    }
  };

  // ==================== HANDLERS ====================

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, item) => {
    setForm(prev => {
      const arr = prev[field] || [];
      const exists = arr.includes(item);
      return {
        ...prev,
        [field]: exists ? arr.filter(i => i !== item) : [...arr, item]
      };
    });
  };

  const isStepValid = (stepId) => {
    switch (stepId) {
      case 1: return form.name.trim().length > 0 && form.primary_goal;
      case 2: return form.bid_price > 0 && form.daily_budget > 0;
      case 3: return true; // Targeting is optional
      case 4: return true; // Audience is optional
      case 5: return form.creative_id || form.creative_ids.length > 0;
      case 6: return form.start_date;
      case 7: return true; // IO & Line Items is optional
      case 8: return true; // Brand safety has defaults
      case 9: return true; // Measurement is optional
      default: return true;
    }
  };

  const handleStepClick = (stepId) => {
    if (stepId <= currentStep || completedSteps.has(stepId - 1) || stepId === currentStep + 1) {
      setCurrentStep(stepId);
    }
  };

  const handleContinue = () => {
    if (isStepValid(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast.error("Please complete required fields");
    }
  };

  const handleSave = async (isDraft = false) => {
    if (!form.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    
    const selectedCreative = form.creative_id || (form.creative_ids.length > 0 ? form.creative_ids[0] : null);
    if (!selectedCreative && !isDraft) {
      toast.error("Please select a creative");
      return;
    }

    setSaving(true);
    try {
      const campaignData = {
        name: form.name,
        bid_floor: form.bid_floor,
        currency: form.currency,
        priority: form.priority,
        placements: [],
        creative_id: selectedCreative || "",
        budget: {
          daily_budget: form.daily_budget,
          total_budget: form.total_budget,
          pacing_type: form.pacing_type,
        },
        bid_shading: { enabled: form.bid_shading_enabled },
        frequency_cap: {
          enabled: form.frequency_cap_enabled,
          max_impressions: form.frequency_cap_count,
          period: form.frequency_cap_period,
        },
        spo: { enabled: form.spo_enabled },
        ml_prediction: { enabled: form.ml_prediction_enabled },
        targeting: {
          geo: { 
            countries: form.geo_countries, 
            states: form.geo_states,
            cities: form.geo_cities, 
            pincodes: form.geo_pincodes,
            latitude: form.geo_latitude,
            longitude: form.geo_longitude,
            radius_km: form.radius_km,
          },
          device: { device_types: form.device_types, os_list: form.os_list },
          telecom: { operators: form.telecom_operators },
          demographics: {
            age_ranges: form.age_ranges,
            genders: form.genders,
            income_segments: form.income_segments,
            languages: form.languages,
          },
          brand_safety: {
            level: form.brand_safety_level,
            blocked_categories: form.blocked_categories,
            blocked_keywords: form.blocked_keywords,
            blocked_domains: form.blocked_domains,
            exclude_ugc: form.exclude_ugc,
            exclude_live_streaming: form.exclude_live_streaming,
          },
          contextual: {
            keywords: form.contextual_keywords,
            contextual_categories: form.contextual_categories,
            keyword_match_type: form.keyword_match_type,
          },
          placement: {
            ad_positions: form.ad_positions,
            viewability_threshold: form.viewability_threshold,
            exclude_non_viewable: form.exclude_non_viewable,
          },
          time: {
            enabled: form.time_targeting_enabled,
            timezone: form.timezone,
            days_of_week: form.days_of_week,
            hours_of_day: form.hours_of_day,
          },
          technical: {
            browsers: form.browsers,
            connection_speeds: form.connection_types,
          },
        },
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        // Extended fields
        business_product: form.business_product,
        description: form.description,
        primary_goal: form.primary_goal,
        kpi_type: form.kpi_type,
        kpi_target: form.kpi_target,
        target_audience_description: form.target_audience_description,
        bidding_strategy: form.bidding_strategy,
        inventory_sources: form.inventory_sources,
        environments: form.environments,
        // Insertion Order & Line Items
        insertion_order: form.io_enabled ? {
          enabled: true,
          name: form.io_name || `IO - ${form.name}`,
          structure_type: form.io_structure_type,
          total_budget: form.total_budget,
        } : { enabled: false },
        line_items: form.io_enabled ? form.line_items.map(li => ({
          name: li.name,
          type: li.type,
          budget: li.budget,
          bid_strategy: li.bid_strategy,
          bid_price: li.bid_price,
          inventory_source: li.inventory_source,
        })) : [],
      };

      if (isEdit) {
        await updateCampaign(id, campaignData);
        toast.success("Campaign updated successfully");
      } else {
        await createCampaign(campaignData);
        toast.success(isDraft ? "Campaign saved as draft" : "Campaign created successfully");
      }
      navigate("/campaigns");
    } catch (error) {
      const errorMsg = error.response?.data?.detail;
      if (typeof errorMsg === 'object' && errorMsg !== null) {
        toast.error(`Validation error: ${JSON.stringify(errorMsg)}`);
      } else {
        toast.error(errorMsg || "Failed to save campaign");
      }
    } finally {
      setSaving(false);
    }
  };

  // ==================== RENDER STEPS ====================

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderOverviewStep();
      case 2: return renderBudgetStep();
      case 3: return renderTargetingStep();
      case 4: return renderAudienceStep();
      case 5: return renderCreativesStep();
      case 6: return renderScheduleStep();
      case 7: return renderIOLineItemsStep();
      case 8: return renderBrandSafetyStep();
      case 9: return renderMeasurementStep();
      default: return null;
    }
  };

  // Step 1: Campaign Overview
  const renderOverviewStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Campaign Overview</h2>
        <p className="text-sm text-[#64748B]">Define your campaign goals and target audience</p>
      </div>

      {/* Campaign Name */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Campaign Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Enter campaign name"
          className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          data-testid="campaign-name-input"
        />
      </div>

      {/* IAB Categories */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">IAB Categories *</Label>
        <Select 
          value={form.iab_categories[0] || ""} 
          onValueChange={(v) => {
            if (v && !form.iab_categories.includes(v)) {
              updateField("iab_categories", [...form.iab_categories, v]);
            }
          }}
        >
          <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
            <SelectValue placeholder="Select IAB category" />
          </SelectTrigger>
          <SelectContent className="surface-primary border-[#2D3B55] max-h-[300px]">
            {IAB_CATEGORIES.map((cat) => (
              <SelectItem key={cat.code} value={cat.code} className="text-[#F8FAFC]">
                {cat.code} - {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.iab_categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {form.iab_categories.map((code) => (
              <Badge key={code} variant="secondary" className="bg-[#3B82F6]/20 text-[#3B82F6]">
                {IAB_CATEGORIES.find(c => c.code === code)?.name || code}
                <button onClick={() => updateField("iab_categories", form.iab_categories.filter(c => c !== code))} className="ml-2">×</button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Primary Goal */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Primary Goal *</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CAMPAIGN_GOALS.map((goal) => (
            <div
              key={goal.value}
              onClick={() => updateField("primary_goal", goal.value)}
              className={`p-3 rounded-lg cursor-pointer border transition-all ${
                form.primary_goal === goal.value
                  ? "bg-[#3B82F6]/20 border-[#3B82F6]"
                  : "surface-secondary border-[#2D3B55] hover:border-[#3B82F6]/50"
              }`}
            >
              <p className="text-sm font-medium text-[#F8FAFC]">{goal.label}</p>
              <p className="text-xs text-[#64748B] mt-1">{goal.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Key Performance Indicator</Label>
          <Select value={form.kpi_type} onValueChange={(v) => updateField("kpi_type", v)}>
            <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="surface-primary border-[#2D3B55]">
              {KPI_TYPES.map((kpi) => (
                <SelectItem key={kpi.value} value={kpi.value} className="text-[#F8FAFC]">
                  {kpi.label} - {kpi.desc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Target {form.kpi_type.toUpperCase()}</Label>
          <Input
            type="number"
            step="0.01"
            value={form.kpi_target}
            onChange={(e) => updateField("kpi_target", parseFloat(e.target.value) || 0)}
            className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Campaign Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Internal notes about this campaign"
          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] min-h-[60px]"
        />
      </div>

      {/* Get Recommendations Button */}
      <Button
        variant="outline"
        onClick={getStrategyRecommendation}
        className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10"
      >
        <Lightbulb className="w-4 h-4 mr-2" />
        Get Strategy Recommendations
      </Button>

      {/* Strategy Recommendations */}
      {strategyRec && (
        <Card className="surface-secondary border-[#3B82F6]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#3B82F6]">Recommended Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Bidding Strategy:</span>
              <span className="text-[#F8FAFC]">{strategyRec.strategy?.bidding_strategy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Frequency Cap:</span>
              <span className="text-[#F8FAFC]">{strategyRec.strategy?.frequency_cap}/{strategyRec.strategy?.frequency_period}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Priority Inventory:</span>
              <span className="text-[#F8FAFC]">{strategyRec.strategy?.priority_inventory?.slice(0,2).join(", ")}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Step 2: Budget & Bidding
  const renderBudgetStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Budget & Bidding</h2>
        <p className="text-sm text-[#64748B]">Set your budget, bidding strategy, and inventory sources</p>
      </div>

      {/* Currency & Bid Pricing Type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Currency *</Label>
          <Select value={form.currency} onValueChange={(v) => updateField("currency", v)}>
            <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="surface-primary border-[#2D3B55]">
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code} className="text-[#F8FAFC]">
                  {c.symbol} {c.code} - {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Bid Pricing Type *</Label>
          <Select value={form.bid_pricing_type} onValueChange={(v) => updateField("bid_pricing_type", v)}>
            <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="surface-primary border-[#2D3B55]">
              {BID_PRICING_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-[#F8FAFC]">
                  {t.label} - {t.desc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Budget */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Daily Budget ({CURRENCIES.find(c => c.code === form.currency)?.symbol || '$'}) *</Label>
          <Input
            type="number"
            value={form.daily_budget}
            onChange={(e) => updateField("daily_budget", parseFloat(e.target.value) || 0)}
            className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Total Budget ({CURRENCIES.find(c => c.code === form.currency)?.symbol || '$'})</Label>
          <Input
            type="number"
            value={form.total_budget}
            onChange={(e) => updateField("total_budget", parseFloat(e.target.value) || 0)}
            className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          />
        </div>
      </div>

      {/* Bidding Strategy */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Bidding Strategy</Label>
        <Select value={form.bidding_strategy} onValueChange={(v) => updateField("bidding_strategy", v)}>
          <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="surface-primary border-[#2D3B55]">
            {BIDDING_STRATEGIES.map((strategy) => (
              <SelectItem key={strategy.value} value={strategy.value} className="text-[#F8FAFC]">
                {strategy.label} - {strategy.desc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bid Floor */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Bid Floor ({form.currency})</Label>
          <Input
            type="number"
            step="0.01"
            value={form.bid_floor}
            onChange={(e) => updateField("bid_floor", parseFloat(e.target.value) || 0)}
            className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          />
        </div>
      </div>

      {/* Pacing */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Budget Pacing</Label>
        <div className="flex gap-4">
          {[
            { value: "even", label: "Even", desc: "Spread evenly throughout the day" },
            { value: "accelerated", label: "Accelerated", desc: "Spend budget as fast as possible" },
            { value: "front_loaded", label: "Front-loaded", desc: "Spend more early in campaign" },
          ].map((pacing) => (
            <div
              key={pacing.value}
              onClick={() => updateField("pacing_type", pacing.value)}
              className={`flex-1 p-3 rounded-lg cursor-pointer border transition-all ${
                form.pacing_type === pacing.value
                  ? "bg-[#8B5CF6]/20 border-[#8B5CF6]"
                  : "surface-secondary border-[#2D3B55] hover:border-[#8B5CF6]/50"
              }`}
            >
              <p className="text-sm font-medium text-[#F8FAFC]">{pacing.label}</p>
              <p className="text-xs text-[#64748B] mt-1">{pacing.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory Sources */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Inventory Sources</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {INVENTORY_SOURCES.map((source) => {
            const Icon = source.icon;
            const isSelected = form.inventory_sources.includes(source.value);
            return (
              <div
                key={source.value}
                onClick={() => toggleArrayItem("inventory_sources", source.value)}
                className={`p-3 rounded-lg cursor-pointer border transition-all ${
                  isSelected
                    ? "bg-[#F59E0B]/20 border-[#F59E0B]"
                    : "surface-secondary border-[#2D3B55] hover:border-[#F59E0B]/50"
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${isSelected ? "text-[#F59E0B]" : "text-[#64748B]"}`} />
                <p className="text-sm font-medium text-[#F8FAFC]">{source.label}</p>
                <p className="text-xs text-[#64748B] mt-1">{source.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Environments */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Environments</Label>
        <div className="flex gap-3">
          {ENVIRONMENTS.map((env) => {
            const Icon = env.icon;
            const isSelected = form.environments.includes(env.value);
            return (
              <div
                key={env.value}
                onClick={() => toggleArrayItem("environments", env.value)}
                className={`flex-1 p-3 rounded-lg cursor-pointer border transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-[#3B82F6]/20 border-[#3B82F6]"
                    : "surface-secondary border-[#2D3B55] hover:border-[#3B82F6]/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-[#3B82F6]" : "text-[#64748B]"}`} />
                <span className="text-sm text-[#F8FAFC]">{env.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forecast Preview */}
      {forecast && (
        <Card className="surface-secondary border-[#10B981]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#10B981]">Performance Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[#64748B]">Est. Impressions</p>
                <p className="text-lg font-bold text-[#F8FAFC]">{forecast.estimated_impressions?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Est. Reach</p>
                <p className="text-lg font-bold text-[#F8FAFC]">{forecast.estimated_reach?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Est. Clicks</p>
                <p className="text-lg font-bold text-[#F8FAFC]">{forecast.estimated_clicks?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Est. CPM</p>
                <p className="text-lg font-bold text-[#F8FAFC]">${forecast.estimated_cpm?.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#64748B]">Confidence</span>
                <span className="text-[#10B981]">{forecast.confidence_level}%</span>
              </div>
              <Progress value={forecast.confidence_level} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Step 3: Targeting
  const renderTargetingStep = () => {
    const availableStates = form.geo_countries.length === 1 ? (STATES_BY_COUNTRY[form.geo_countries[0]] || []) : [];
    const availableCities = form.geo_countries.length === 1 ? (CITIES_BY_COUNTRY[form.geo_countries[0]] || []) : [];
    const availableOperators = form.geo_countries.length === 1 ? (TELECOM_OPERATORS[form.geo_countries[0]] || []) : [];
    
    return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Targeting</h2>
        <p className="text-sm text-[#64748B]">Define geographic, device, and technical targeting</p>
      </div>

      <Tabs defaultValue="geo" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-[#0A0F1C]">
          <TabsTrigger value="geo" className="data-[state=active]:bg-[#3B82F6]">Geography</TabsTrigger>
          <TabsTrigger value="device" className="data-[state=active]:bg-[#3B82F6]">Device</TabsTrigger>
          <TabsTrigger value="contextual" className="data-[state=active]:bg-[#3B82F6]">Contextual</TabsTrigger>
          <TabsTrigger value="technical" className="data-[state=active]:bg-[#3B82F6]">Technical</TabsTrigger>
        </TabsList>

        {/* Geographic Targeting */}
        <TabsContent value="geo" className="space-y-4 mt-4">
          {/* Countries Dropdown */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Countries</Label>
            <Select 
              value={form.geo_countries[0] || ""} 
              onValueChange={(v) => {
                if (v && !form.geo_countries.includes(v)) {
                  updateField("geo_countries", [...form.geo_countries, v]);
                  // Reset states and cities when country changes
                  updateField("geo_states", []);
                  updateField("geo_cities", []);
                  updateField("telecom_operators", []);
                }
              }}
            >
              <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="surface-primary border-[#2D3B55] max-h-[300px]">
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code} className="text-[#F8FAFC]">
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.geo_countries.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.geo_countries.map((code) => (
                  <Badge key={code} variant="secondary" className="bg-[#3B82F6]/20 text-[#3B82F6]">
                    {COUNTRIES.find(c => c.code === code)?.name || code}
                    <button onClick={() => {
                      updateField("geo_countries", form.geo_countries.filter(c => c !== code));
                      updateField("geo_states", []);
                      updateField("geo_cities", []);
                    }} className="ml-2">×</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* States Dropdown */}
          {availableStates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">States / Regions</Label>
              <Select 
                value={form.geo_states[0] || ""} 
                onValueChange={(v) => {
                  if (v && !form.geo_states.includes(v)) {
                    updateField("geo_states", [...form.geo_states, v]);
                  }
                }}
              >
                <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                  <SelectValue placeholder="Select state/region" />
                </SelectTrigger>
                <SelectContent className="surface-primary border-[#2D3B55] max-h-[300px]">
                  {availableStates.map((state) => (
                    <SelectItem key={state} value={state} className="text-[#F8FAFC]">{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.geo_states.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.geo_states.map((state) => (
                    <Badge key={state} variant="secondary" className="bg-[#10B981]/20 text-[#10B981]">
                      {state}
                      <button onClick={() => updateField("geo_states", form.geo_states.filter(s => s !== state))} className="ml-2">×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cities Dropdown */}
          {availableCities.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Cities</Label>
              <Select 
                value={form.geo_cities[0] || ""} 
                onValueChange={(v) => {
                  if (v && !form.geo_cities.includes(v)) {
                    updateField("geo_cities", [...form.geo_cities, v]);
                  }
                }}
              >
                <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent className="surface-primary border-[#2D3B55] max-h-[300px]">
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city} className="text-[#F8FAFC]">{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.geo_cities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.geo_cities.map((city) => (
                    <Badge key={city} variant="secondary" className="bg-[#F59E0B]/20 text-[#F59E0B]">
                      {city}
                      <button onClick={() => updateField("geo_cities", form.geo_cities.filter(c => c !== city))} className="ml-2">×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pincode */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Pincodes / ZIP Codes</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter pincode and press Enter"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    const pincode = e.target.value.trim();
                    if (!form.geo_pincodes.includes(pincode)) {
                      updateField("geo_pincodes", [...form.geo_pincodes, pincode]);
                    }
                    e.target.value = '';
                  }
                }}
              />
            </div>
            {form.geo_pincodes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.geo_pincodes.map((pin) => (
                  <Badge key={pin} variant="secondary" className="bg-[#8B5CF6]/20 text-[#8B5CF6]">
                    {pin}
                    <button onClick={() => updateField("geo_pincodes", form.geo_pincodes.filter(p => p !== pin))} className="ml-2">×</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Lat/Long with Radius */}
          <Card className="surface-secondary border-[#2D3B55]">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <Switch
                  checked={form.lat_long_targeting}
                  onCheckedChange={(v) => updateField("lat_long_targeting", v)}
                />
                <div>
                  <p className="text-sm text-[#F8FAFC]">Radius-based Targeting</p>
                  <p className="text-xs text-[#64748B]">Target users within a specific distance from coordinates</p>
                </div>
              </div>
              
              {form.lat_long_targeting && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Latitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={form.geo_latitude}
                      onChange={(e) => updateField("geo_latitude", e.target.value)}
                      placeholder="e.g., 25.2048"
                      className="surface-primary border-[#2D3B55] text-[#F8FAFC]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Longitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={form.geo_longitude}
                      onChange={(e) => updateField("geo_longitude", e.target.value)}
                      placeholder="e.g., 55.2708"
                      className="surface-primary border-[#2D3B55] text-[#F8FAFC]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Radius (km)</Label>
                    <Select value={form.radius_km.toString()} onValueChange={(v) => updateField("radius_km", parseInt(v))}>
                      <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="surface-primary border-[#2D3B55]">
                        {[1, 5, 10, 25, 50, 100, 200, 500].map((r) => (
                          <SelectItem key={r} value={r.toString()} className="text-[#F8FAFC]">{r} km</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Telecom Operators */}
          {availableOperators.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Telecom Operators</Label>
              <Select 
                value={form.telecom_operators[0] || ""} 
                onValueChange={(v) => {
                  if (v && !form.telecom_operators.includes(v)) {
                    updateField("telecom_operators", [...form.telecom_operators, v]);
                  }
                }}
              >
                <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                  <SelectValue placeholder="Select telecom operator" />
                </SelectTrigger>
                <SelectContent className="surface-primary border-[#2D3B55]">
                  {availableOperators.map((op) => (
                    <SelectItem key={op} value={op} className="text-[#F8FAFC]">{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.telecom_operators.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.telecom_operators.map((op) => (
                    <Badge key={op} variant="secondary" className="bg-[#EC4899]/20 text-[#EC4899]">
                      {op}
                      <button onClick={() => updateField("telecom_operators", form.telecom_operators.filter(o => o !== op))} className="ml-2">×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Device Targeting */}
        <TabsContent value="device" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Device Types</Label>
            <div className="flex flex-wrap gap-2">
              {DEVICE_TYPES.map((device) => (
                <Badge
                  key={device.id}
                  onClick={() => toggleArrayItem("device_types", device.id)}
                  className={`cursor-pointer ${
                    form.device_types.includes(device.id)
                      ? "bg-[#3B82F6] text-white"
                      : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                  }`}
                >
                  {device.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Operating Systems</Label>
            <div className="flex flex-wrap gap-2">
              {OS_LIST.map((os) => (
                <Badge
                  key={os}
                  onClick={() => toggleArrayItem("os_list", os)}
                  className={`cursor-pointer ${
                    form.os_list.includes(os)
                      ? "bg-[#10B981] text-white"
                      : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                  }`}
                >
                  {os}
                </Badge>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Contextual Targeting */}
        <TabsContent value="contextual" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Keywords</Label>
            <Textarea
              placeholder="Enter keywords (one per line)"
              value={form.contextual_keywords.join("\n")}
              onChange={(e) => updateField("contextual_keywords", e.target.value.split("\n").filter(k => k.trim()))}
              className="surface-secondary border-[#2D3B55] text-[#F8FAFC] min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Keyword Match Type</Label>
            <Select value={form.keyword_match_type} onValueChange={(v) => updateField("keyword_match_type", v)}>
              <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="surface-primary border-[#2D3B55]">
                <SelectItem value="broad" className="text-[#F8FAFC]">Broad Match</SelectItem>
                <SelectItem value="phrase" className="text-[#F8FAFC]">Phrase Match</SelectItem>
                <SelectItem value="exact" className="text-[#F8FAFC]">Exact Match</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        {/* Technical Targeting */}
        <TabsContent value="technical" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Browsers</Label>
            <div className="flex flex-wrap gap-2">
              {BROWSERS.map((browser) => (
                <Badge
                  key={browser}
                  onClick={() => toggleArrayItem("browsers", browser)}
                  className={`cursor-pointer ${
                    form.browsers.includes(browser)
                      ? "bg-[#8B5CF6] text-white"
                      : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                  }`}
                >
                  {browser}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Connection Types</Label>
            <div className="flex flex-wrap gap-2">
              {CONNECTION_TYPES.map((conn) => (
                <Badge
                  key={conn}
                  onClick={() => toggleArrayItem("connection_types", conn)}
                  className={`cursor-pointer ${
                    form.connection_types.includes(conn)
                      ? "bg-[#F59E0B] text-white"
                      : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                  }`}
                >
                  {conn.toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>

          {/* Viewability */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Viewability Threshold: {form.viewability_threshold}%</Label>
            <Slider
              value={[form.viewability_threshold]}
              onValueChange={([v]) => updateField("viewability_threshold", v)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                checked={form.exclude_non_viewable}
                onCheckedChange={(v) => updateField("exclude_non_viewable", v)}
              />
              <span className="text-sm text-[#94A3B8]">Exclude non-viewable inventory</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
  };

  // Step 4: Audience
  const renderAudienceStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Audience</h2>
        <p className="text-sm text-[#64748B]">Define demographic and audience targeting</p>
      </div>

      {/* First Party Audiences */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">First Party Audiences</CardTitle>
          <p className="text-xs text-[#64748B]">Your owned customer data (customer lists, site visitors)</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Create / Import Audience</Label>
              <div className="flex gap-2">
                <Input
                  value={form.first_party_audience_input}
                  onChange={(e) => updateField("first_party_audience_input", e.target.value)}
                  placeholder="Audience name"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (form.first_party_audience_input.trim()) {
                      updateField("first_party_audiences", [...form.first_party_audiences, form.first_party_audience_input.trim()]);
                      updateField("first_party_audience_input", "");
                    }
                  }}
                  className="border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10"
                >
                  Add
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Select Existing</Label>
              <Select onValueChange={(v) => {
                if (v && !form.first_party_audiences.includes(v)) {
                  updateField("first_party_audiences", [...form.first_party_audiences, v]);
                }
              }}>
                <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent className="surface-primary border-[#2D3B55]">
                  <SelectItem value="All Site Visitors" className="text-[#F8FAFC]">All Site Visitors</SelectItem>
                  <SelectItem value="Cart Abandoners" className="text-[#F8FAFC]">Cart Abandoners</SelectItem>
                  <SelectItem value="Converters" className="text-[#F8FAFC]">Converters</SelectItem>
                  <SelectItem value="Newsletter Subscribers" className="text-[#F8FAFC]">Newsletter Subscribers</SelectItem>
                  <SelectItem value="App Users" className="text-[#F8FAFC]">App Users</SelectItem>
                  <SelectItem value="High Value Customers" className="text-[#F8FAFC]">High Value Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.first_party_audiences.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.first_party_audiences.map((aud) => (
                <Badge key={aud} variant="secondary" className="bg-[#3B82F6]/20 text-[#3B82F6]">
                  {aud}
                  <button onClick={() => updateField("first_party_audiences", form.first_party_audiences.filter(a => a !== aud))} className="ml-2">×</button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Third Party Audiences */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">Third Party Audiences</CardTitle>
          <p className="text-xs text-[#64748B]">Data from external providers</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Create / Import Audience</Label>
              <div className="flex gap-2">
                <Input
                  value={form.third_party_audience_input}
                  onChange={(e) => updateField("third_party_audience_input", e.target.value)}
                  placeholder="Audience name or segment ID"
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (form.third_party_audience_input.trim()) {
                      updateField("third_party_audiences", [...form.third_party_audiences, form.third_party_audience_input.trim()]);
                      updateField("third_party_audience_input", "");
                    }
                  }}
                  className="border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10"
                >
                  Add
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Select Data Provider Segment</Label>
              <Select onValueChange={(v) => {
                if (v && !form.third_party_audiences.includes(v)) {
                  updateField("third_party_audiences", [...form.third_party_audiences, v]);
                }
              }}>
                <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                  <SelectValue placeholder="Select segment" />
                </SelectTrigger>
                <SelectContent className="surface-primary border-[#2D3B55]">
                  <SelectItem value="Oracle - In-Market Auto" className="text-[#F8FAFC]">Oracle - In-Market Auto</SelectItem>
                  <SelectItem value="Oracle - In-Market Travel" className="text-[#F8FAFC]">Oracle - In-Market Travel</SelectItem>
                  <SelectItem value="Experian - Affluent Families" className="text-[#F8FAFC]">Experian - Affluent Families</SelectItem>
                  <SelectItem value="Experian - Young Professionals" className="text-[#F8FAFC]">Experian - Young Professionals</SelectItem>
                  <SelectItem value="Nielsen - Tech Enthusiasts" className="text-[#F8FAFC]">Nielsen - Tech Enthusiasts</SelectItem>
                  <SelectItem value="Nielsen - Fitness Enthusiasts" className="text-[#F8FAFC]">Nielsen - Fitness Enthusiasts</SelectItem>
                  <SelectItem value="IHS Markit - Business Decision Makers" className="text-[#F8FAFC]">IHS Markit - Business Decision Makers</SelectItem>
                  <SelectItem value="Bombora - Intent - Cloud Solutions" className="text-[#F8FAFC]">Bombora - Intent - Cloud Solutions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.third_party_audiences.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.third_party_audiences.map((aud) => (
                <Badge key={aud} variant="secondary" className="bg-[#10B981]/20 text-[#10B981]">
                  {aud}
                  <button onClick={() => updateField("third_party_audiences", form.third_party_audiences.filter(a => a !== aud))} className="ml-2">×</button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demographics */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">Demographics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Age Ranges */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Age Ranges</Label>
            <Select onValueChange={(v) => {
              if (v && !form.age_ranges.includes(v)) {
                updateField("age_ranges", [...form.age_ranges, v]);
              }
            }}>
              <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                <SelectValue placeholder="Select age range" />
              </SelectTrigger>
              <SelectContent className="surface-primary border-[#2D3B55]">
                {AGE_RANGES.map((age) => (
                  <SelectItem key={age} value={age} className="text-[#F8FAFC]">{age}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.age_ranges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.age_ranges.map((age) => (
                  <Badge key={age} variant="secondary" className="bg-[#3B82F6]/20 text-[#3B82F6]">
                    {age}
                    <button onClick={() => updateField("age_ranges", form.age_ranges.filter(a => a !== age))} className="ml-2">×</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Genders */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Genders</Label>
            <Select onValueChange={(v) => {
              if (v && !form.genders.includes(v)) {
                updateField("genders", [...form.genders, v]);
              }
            }}>
              <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent className="surface-primary border-[#2D3B55]">
                {GENDERS.map((gender) => (
                  <SelectItem key={gender} value={gender} className="text-[#F8FAFC] capitalize">{gender}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.genders.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.genders.map((gender) => (
                  <Badge key={gender} variant="secondary" className="bg-[#10B981]/20 text-[#10B981] capitalize">
                    {gender}
                    <button onClick={() => updateField("genders", form.genders.filter(g => g !== gender))} className="ml-2">×</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Income Segments */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Income Segments</Label>
            <Select onValueChange={(v) => {
              if (v && !form.income_segments.includes(v)) {
                updateField("income_segments", [...form.income_segments, v]);
              }
            }}>
              <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                <SelectValue placeholder="Select income segment" />
              </SelectTrigger>
              <SelectContent className="surface-primary border-[#2D3B55]">
                {INCOME_SEGMENTS.map((segment) => (
                  <SelectItem key={segment} value={segment} className="text-[#F8FAFC] capitalize">{segment}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.income_segments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.income_segments.map((segment) => (
                  <Badge key={segment} variant="secondary" className="bg-[#8B5CF6]/20 text-[#8B5CF6] capitalize">
                    {segment}
                    <button onClick={() => updateField("income_segments", form.income_segments.filter(s => s !== segment))} className="ml-2">×</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Languages</Label>
            <Select onValueChange={(v) => {
              if (v && !form.languages.includes(v)) {
                updateField("languages", [...form.languages, v]);
              }
            }}>
              <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="surface-primary border-[#2D3B55]">
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code} className="text-[#F8FAFC]">{lang.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.languages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.languages.map((code) => (
                  <Badge key={code} variant="secondary" className="bg-[#F59E0B]/20 text-[#F59E0B]">
                    {LANGUAGES.find(l => l.code === code)?.name || code}
                    <button onClick={() => updateField("languages", form.languages.filter(l => l !== code))} className="ml-2">×</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lookalike Modeling */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">Lookalike Modeling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Switch
              checked={form.lookalike_enabled}
              onCheckedChange={(v) => updateField("lookalike_enabled", v)}
            />
            <div className="flex-1">
              <p className="text-sm text-[#F8FAFC]">Enable Lookalike Audiences</p>
              <p className="text-xs text-[#64748B]">Find users similar to your converters</p>
            </div>
            {form.lookalike_enabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#94A3B8]">Expansion:</span>
                <Select value={form.lookalike_expansion.toString()} onValueChange={(v) => updateField("lookalike_expansion", parseInt(v))}>
                  <SelectTrigger className="w-20 surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="surface-primary border-[#2D3B55]">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={n.toString()} className="text-[#F8FAFC]">{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Step 5: Creatives
  const renderCreativesStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Creatives</h2>
        <p className="text-sm text-[#64748B]">Select creatives for your campaign</p>
      </div>

      {creatives.length === 0 ? (
        <Card className="surface-secondary border-panel">
          <CardContent className="py-8 text-center">
            <Image className="w-12 h-12 mx-auto text-[#64748B] mb-4" />
            <p className="text-[#94A3B8]">No creatives available</p>
            <Button
              variant="outline"
              className="mt-4 border-[#3B82F6] text-[#3B82F6]"
              onClick={() => navigate("/editor")}
            >
              Create Creative
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {creatives.map((creative) => {
            const isSelected = form.creative_id === creative.id || form.creative_ids.includes(creative.id);
            return (
              <div
                key={creative.id}
                onClick={() => updateField("creative_id", creative.id)}
                className={`p-4 rounded-lg cursor-pointer border transition-all ${
                  isSelected
                    ? "bg-[#3B82F6]/20 border-[#3B82F6]"
                    : "surface-secondary border-[#2D3B55] hover:border-[#3B82F6]/50"
                }`}
                data-testid={`creative-${creative.id}`}
              >
                {creative.preview_url ? (
                  <img 
                    src={creative.preview_url} 
                    alt={creative.name}
                    className="w-full h-24 object-cover rounded mb-2"
                  />
                ) : (
                  <div className="w-full h-24 bg-[#1E293B] rounded mb-2 flex items-center justify-center">
                    <Image className="w-8 h-8 text-[#64748B]" />
                  </div>
                )}
                <p className="text-sm text-[#F8FAFC] truncate">{creative.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="text-[10px] bg-[#3B82F6]/20 text-[#3B82F6]">{creative.type}</Badge>
                  {creative.format && (
                    <Badge className="text-[10px] bg-[#10B981]/20 text-[#10B981]">{creative.format}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creative Best Practices */}
      <Card className="surface-secondary border-[#F59E0B]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#F59E0B] flex items-center gap-2">
            <Lightbulb className="w-4 h-4" /> Creative Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#94A3B8] space-y-1">
          <p>• Use multiple ad sizes (300x250, 728x90, 320x50) for maximum reach</p>
          <p>• Test 3-4 creative variations and optimize after 1000 impressions each</p>
          <p>• Include clear call-to-action in all creatives</p>
          <p>• For video: 15s or 30s formats work best; ensure sound-off compatibility</p>
        </CardContent>
      </Card>
    </div>
  );

  // Step 6: Schedule & Pacing
  const renderScheduleStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Schedule & Pacing</h2>
        <p className="text-sm text-[#64748B]">Set flight dates, frequency caps, and dayparting</p>
      </div>

      {/* Flight Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Start Date *</Label>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) => updateField("start_date", e.target.value)}
            className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[#94A3B8]">End Date</Label>
          <Input
            type="date"
            value={form.end_date}
            onChange={(e) => updateField("end_date", e.target.value)}
            min={form.start_date}
            className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
          />
        </div>
      </div>

      {/* Frequency Capping */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-[#F8FAFC]">Frequency Capping</CardTitle>
            <Switch
              checked={form.frequency_cap_enabled}
              onCheckedChange={(v) => updateField("frequency_cap_enabled", v)}
            />
          </div>
        </CardHeader>
        {form.frequency_cap_enabled && (
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-[#94A3B8]">Max Impressions</Label>
                <Input
                  type="number"
                  value={form.frequency_cap_count}
                  onChange={(e) => updateField("frequency_cap_count", parseInt(e.target.value) || 1)}
                  min={1}
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-[#94A3B8]">Per</Label>
                <Select 
                  value={form.frequency_cap_period} 
                  onValueChange={(v) => updateField("frequency_cap_period", v)}
                >
                  <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="surface-primary border-[#2D3B55]">
                    <SelectItem value="hour" className="text-[#F8FAFC]">Hour</SelectItem>
                    <SelectItem value="day" className="text-[#F8FAFC]">Day</SelectItem>
                    <SelectItem value="week" className="text-[#F8FAFC]">Week</SelectItem>
                    <SelectItem value="month" className="text-[#F8FAFC]">Month</SelectItem>
                    <SelectItem value="lifetime" className="text-[#F8FAFC]">Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Dayparting */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-[#F8FAFC]">Dayparting</CardTitle>
            <Switch
              checked={form.time_targeting_enabled}
              onCheckedChange={(v) => updateField("time_targeting_enabled", v)}
            />
          </div>
          <CardDescription className="text-[#64748B]">
            Target specific days and hours
          </CardDescription>
        </CardHeader>
        {form.time_targeting_enabled && (
          <CardContent className="space-y-4">
            {/* Days */}
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Days of Week</Label>
              <div className="flex gap-2">
                {DAYS.map((day, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleArrayItem("days_of_week", idx)}
                    className={`w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center text-sm ${
                      form.days_of_week.includes(idx)
                        ? "bg-[#3B82F6] text-white"
                        : "bg-[#1E293B] text-[#94A3B8] hover:bg-[#2D3B55]"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Hours Grid */}
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Hours of Day</Label>
              <div className="grid grid-cols-12 gap-1">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    onClick={() => toggleArrayItem("hours_of_day", hour)}
                    className={`p-1 rounded text-center text-xs cursor-pointer ${
                      form.hours_of_day.includes(hour)
                        ? "bg-[#10B981] text-white"
                        : "bg-[#1E293B] text-[#64748B] hover:bg-[#2D3B55]"
                    }`}
                  >
                    {hour}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );

  // Step 7: IO & Line Items
  const renderIOLineItemsStep = () => {
    const addLineItem = () => {
      const newLineItem = {
        id: Date.now().toString(),
        name: `Line Item ${form.line_items.length + 1}`,
        type: "prospecting",
        budget: Math.round(form.total_budget * 0.2),
        bid_strategy: form.bidding_strategy,
        bid_price: form.bid_price,
        inventory_source: form.inventory_sources[0] || "open_exchange",
      };
      updateField("line_items", [...form.line_items, newLineItem]);
    };

    const updateLineItem = (id, field, value) => {
      const updated = form.line_items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      );
      updateField("line_items", updated);
    };

    const removeLineItem = (id) => {
      updateField("line_items", form.line_items.filter(item => item.id !== id));
    };

    const getLineItemTypeColor = (type) => {
      return LINE_ITEM_TYPES.find(t => t.value === type)?.color || "#64748B";
    };

    const totalLineItemBudget = form.line_items.reduce((sum, item) => sum + (item.budget || 0), 0);
    const remainingBudget = form.total_budget - totalLineItemBudget;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Insertion Order & Line Items</h2>
          <p className="text-sm text-[#64748B]">Structure your campaign with insertion orders and line items for granular control</p>
        </div>

        {/* IO Toggle */}
        <Card className="surface-secondary border-[#2D3B55]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#3B82F6]/20">
                  <FileText className="w-5 h-5 text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F8FAFC]">Enable Insertion Order</p>
                  <p className="text-xs text-[#64748B]">Structure campaign with IO and line items for advanced budget control</p>
                </div>
              </div>
              <Switch
                checked={form.io_enabled}
                onCheckedChange={(v) => updateField("io_enabled", v)}
              />
            </div>
          </CardContent>
        </Card>

        {form.io_enabled && (
          <>
            {/* IO Configuration */}
            <Card className="surface-secondary border-[#2D3B55]">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-medium text-[#F8FAFC]">Insertion Order Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">IO Name</Label>
                    <Input
                      value={form.io_name}
                      onChange={(e) => updateField("io_name", e.target.value)}
                      placeholder={`IO - ${form.name || "Campaign"}`}
                      className="surface-primary border-[#2D3B55] text-[#F8FAFC]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8]">Structure Type</Label>
                    <Select 
                      value={form.io_structure_type} 
                      onValueChange={(v) => updateField("io_structure_type", v)}
                    >
                      <SelectTrigger className="surface-primary border-[#2D3B55] text-[#F8FAFC]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="surface-primary border-[#2D3B55]">
                        {IO_STRUCTURE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-[#F8FAFC]">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Budget Summary */}
                <div className="p-3 rounded-lg bg-[#0A0F1C] border border-[#2D3B55]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#94A3B8]">Total Campaign Budget</span>
                    <span className="text-sm font-medium text-[#F8FAFC]">${form.total_budget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-[#94A3B8]">Allocated to Line Items</span>
                    <span className="text-sm font-medium text-[#3B82F6]">${totalLineItemBudget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-[#94A3B8]">Remaining</span>
                    <span className={`text-sm font-medium ${remainingBudget < 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                      ${remainingBudget.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[#F8FAFC]">Line Items</h3>
                <Button
                  size="sm"
                  onClick={addLineItem}
                  className="bg-[#10B981] hover:bg-[#059669]"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Line Item
                </Button>
              </div>

              {form.line_items.length === 0 ? (
                <Card className="surface-secondary border-[#2D3B55] border-dashed">
                  <CardContent className="p-8 text-center">
                    <Layers className="w-10 h-10 mx-auto text-[#64748B] mb-3" />
                    <p className="text-sm text-[#94A3B8] mb-3">No line items yet</p>
                    <p className="text-xs text-[#64748B] mb-4">
                      Line items allow you to split your campaign budget across different tactics
                    </p>
                    <Button
                      size="sm"
                      onClick={addLineItem}
                      className="bg-[#3B82F6] hover:bg-[#2563EB]"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Create First Line Item
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {form.line_items.map((item, index) => (
                    <Card 
                      key={item.id} 
                      className="surface-secondary border-[#2D3B55] border-l-4"
                      style={{ borderLeftColor: getLineItemTypeColor(item.type) }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#64748B]">#{index + 1}</span>
                            <Input
                              value={item.name}
                              onChange={(e) => updateLineItem(item.id, "name", e.target.value)}
                              className="w-48 h-8 surface-primary border-[#2D3B55] text-[#F8FAFC] text-sm"
                              placeholder="Line item name"
                            />
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeLineItem(item.id)}
                            className="h-8 w-8 text-[#EF4444] hover:bg-[#EF4444]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          {/* Type */}
                          <div className="space-y-1">
                            <Label className="text-xs text-[#64748B]">Type</Label>
                            <Select 
                              value={item.type} 
                              onValueChange={(v) => updateLineItem(item.id, "type", v)}
                            >
                              <SelectTrigger className="h-9 surface-primary border-[#2D3B55] text-[#F8FAFC] text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="surface-primary border-[#2D3B55]">
                                {LINE_ITEM_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value} className="text-[#F8FAFC]">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: type.color }}
                                      />
                                      {type.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Budget */}
                          <div className="space-y-1">
                            <Label className="text-xs text-[#64748B]">Budget ($)</Label>
                            <Input
                              type="number"
                              value={item.budget}
                              onChange={(e) => updateLineItem(item.id, "budget", parseFloat(e.target.value) || 0)}
                              className="h-9 surface-primary border-[#2D3B55] text-[#F8FAFC] text-sm"
                            />
                          </div>

                          {/* Bid Strategy */}
                          <div className="space-y-1">
                            <Label className="text-xs text-[#64748B]">Bid Strategy</Label>
                            <Select 
                              value={item.bid_strategy} 
                              onValueChange={(v) => updateLineItem(item.id, "bid_strategy", v)}
                            >
                              <SelectTrigger className="h-9 surface-primary border-[#2D3B55] text-[#F8FAFC] text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="surface-primary border-[#2D3B55]">
                                {BIDDING_STRATEGIES.map((s) => (
                                  <SelectItem key={s.value} value={s.value} className="text-[#F8FAFC]">
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Inventory Source */}
                          <div className="space-y-1">
                            <Label className="text-xs text-[#64748B]">Inventory</Label>
                            <Select 
                              value={item.inventory_source} 
                              onValueChange={(v) => updateLineItem(item.id, "inventory_source", v)}
                            >
                              <SelectTrigger className="h-9 surface-primary border-[#2D3B55] text-[#F8FAFC] text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="surface-primary border-[#2D3B55]">
                                {INVENTORY_SOURCES.map((s) => (
                                  <SelectItem key={s.value} value={s.value} className="text-[#F8FAFC]">
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Quick Add Recommendations */}
              {form.line_items.length > 0 && form.line_items.length < 5 && (
                <Card className="surface-secondary border-[#2D3B55]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-[#F59E0B]" />
                      <span className="text-sm font-medium text-[#F8FAFC]">Suggested Line Items</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {LINE_ITEM_TYPES
                        .filter(type => !form.line_items.some(li => li.type === type.value))
                        .slice(0, 3)
                        .map(type => (
                          <Button
                            key={type.value}
                            size="sm"
                            variant="outline"
                            className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC]"
                            onClick={() => {
                              const newItem = {
                                id: Date.now().toString(),
                                name: `${type.label} - ${form.name || "Campaign"}`,
                                type: type.value,
                                budget: Math.round(remainingBudget * 0.3),
                                bid_strategy: form.bidding_strategy,
                                bid_price: form.bid_price,
                                inventory_source: form.inventory_sources[0] || "open_exchange",
                              };
                              updateField("line_items", [...form.line_items, newItem]);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {type.label}
                          </Button>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        {!form.io_enabled && (
          <Card className="surface-secondary border-[#2D3B55]">
            <CardContent className="p-6 text-center">
              <Layers className="w-12 h-12 mx-auto text-[#64748B] mb-3" />
              <h3 className="text-sm font-medium text-[#F8FAFC] mb-2">Simple Campaign Structure</h3>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Your campaign will run as a single entity. Enable Insertion Orders above to split 
                budget across multiple line items for granular targeting and budget control.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Step 8: Brand Safety
  const renderBrandSafetyStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Brand Safety</h2>
        <p className="text-sm text-[#64748B]">Configure brand safety and content controls</p>
      </div>

      {/* Brand Safety Level */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Brand Safety Level</Label>
        <div className="grid grid-cols-3 gap-4">
          {BRAND_SAFETY_LEVELS.map((level) => (
            <div
              key={level.value}
              onClick={() => updateField("brand_safety_level", level.value)}
              className={`p-4 rounded-lg cursor-pointer border transition-all ${
                form.brand_safety_level === level.value
                  ? "bg-[#10B981]/20 border-[#10B981]"
                  : "surface-secondary border-[#2D3B55] hover:border-[#10B981]/50"
              }`}
            >
              <Shield className={`w-6 h-6 mb-2 ${
                form.brand_safety_level === level.value ? "text-[#10B981]" : "text-[#64748B]"
              }`} />
              <p className="text-sm font-medium text-[#F8FAFC]">{level.label}</p>
              <p className="text-xs text-[#64748B] mt-1">{level.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content Exclusions */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">Content Exclusions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={form.exclude_ugc}
              onCheckedChange={(v) => updateField("exclude_ugc", v)}
            />
            <div>
              <p className="text-sm text-[#F8FAFC]">Exclude User-Generated Content</p>
              <p className="text-xs text-[#64748B]">Avoid unvetted UGC platforms</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Checkbox
              checked={form.exclude_live_streaming}
              onCheckedChange={(v) => updateField("exclude_live_streaming", v)}
            />
            <div>
              <p className="text-sm text-[#F8FAFC]">Exclude Live Streaming</p>
              <p className="text-xs text-[#64748B]">Avoid live/unmoderated content</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocked Keywords */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Blocked Keywords</Label>
        <Textarea
          placeholder="Enter keywords to block (one per line)"
          value={form.blocked_keywords.join("\n")}
          onChange={(e) => updateField("blocked_keywords", e.target.value.split("\n").filter(k => k.trim()))}
          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] min-h-[80px]"
        />
      </div>

      {/* Blocked Domains */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Blocked Domains</Label>
        <Textarea
          placeholder="Enter domains to block (one per line)"
          value={form.blocked_domains.join("\n")}
          onChange={(e) => updateField("blocked_domains", e.target.value.split("\n").filter(d => d.trim()))}
          className="surface-secondary border-[#2D3B55] text-[#F8FAFC] min-h-[80px]"
        />
      </div>
    </div>
  );

  // Step 8: Measurement
  const renderMeasurementStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#F8FAFC] mb-1">Measurement & Optimization</h2>
        <p className="text-sm text-[#64748B]">Configure conversion tracking and attribution</p>
      </div>

      {/* Conversion Tracking */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-[#F8FAFC]">Conversion Tracking</CardTitle>
            <Switch
              checked={form.conversion_tracking_enabled}
              onCheckedChange={(v) => updateField("conversion_tracking_enabled", v)}
            />
          </div>
        </CardHeader>
        {form.conversion_tracking_enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8]">Conversion Pixel ID</Label>
              <Input
                value={form.conversion_pixel_id}
                onChange={(e) => updateField("conversion_pixel_id", e.target.value)}
                placeholder="Enter your pixel ID"
                className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">Click-through Window (days)</Label>
                <Input
                  type="number"
                  value={form.click_through_window}
                  onChange={(e) => updateField("click_through_window", parseInt(e.target.value) || 30)}
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#94A3B8]">View-through Window (days)</Label>
                <Input
                  type="number"
                  value={form.view_through_window}
                  onChange={(e) => updateField("view_through_window", parseInt(e.target.value) || 1)}
                  className="surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Attribution Model */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Attribution Model</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ATTRIBUTION_MODELS.map((model) => (
            <div
              key={model.value}
              onClick={() => updateField("attribution_model", model.value)}
              className={`p-3 rounded-lg cursor-pointer border transition-all ${
                form.attribution_model === model.value
                  ? "bg-[#8B5CF6]/20 border-[#8B5CF6]"
                  : "surface-secondary border-[#2D3B55] hover:border-[#8B5CF6]/50"
              }`}
            >
              <p className="text-sm font-medium text-[#F8FAFC]">{model.label}</p>
              <p className="text-xs text-[#64748B] mt-1">{model.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <Card className="surface-primary border-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F8FAFC]">Advanced Optimization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#F8FAFC]">Bid Shading</p>
              <p className="text-xs text-[#64748B]">Automatically adjust bids based on win rate</p>
            </div>
            <Switch
              checked={form.bid_shading_enabled}
              onCheckedChange={(v) => updateField("bid_shading_enabled", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#F8FAFC]">ML-Based Prediction</p>
              <p className="text-xs text-[#64748B]">Use machine learning for bid optimization</p>
            </div>
            <Switch
              checked={form.ml_prediction_enabled}
              onCheckedChange={(v) => updateField("ml_prediction_enabled", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#F8FAFC]">Supply Path Optimization</p>
              <p className="text-xs text-[#64748B]">Optimize inventory supply paths</p>
            </div>
            <Switch
              checked={form.spo_enabled}
              onCheckedChange={(v) => updateField("spo_enabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Priority */}
      <div className="space-y-2">
        <Label className="text-[#94A3B8]">Campaign Priority: {form.priority}</Label>
        <Slider
          value={[form.priority]}
          onValueChange={([v]) => updateField("priority", v)}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <p className="text-xs text-[#64748B]">Higher priority campaigns are preferred in auctions</p>
      </div>
    </div>
  );

  // ==================== MAIN RENDER ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]" data-testid="campaign-wizard">
      {/* Sidebar */}
      <div className="w-72 surface-primary border-r border-[#2D3B55] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#2D3B55]">
          <Button
            variant="ghost"
            onClick={() => navigate("/campaigns")}
            className="text-[#94A3B8] hover:text-[#F8FAFC] mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to campaigns
          </Button>
          <h1 className="text-lg font-semibold text-[#F8FAFC]">
            {isEdit ? "Edit campaign" : "New campaign"}
          </h1>
        </div>

        {/* Steps */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = completedSteps.has(step.id);
              const isAccessible = step.id <= currentStep || completedSteps.has(step.id - 1) || step.id === currentStep + 1;

              return (
                <div
                  key={step.id}
                  onClick={() => isAccessible && handleStepClick(step.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-[#3B82F6]/20 border border-[#3B82F6]"
                      : isCompleted
                      ? "bg-[#10B981]/10 cursor-pointer hover:bg-[#10B981]/20"
                      : isAccessible
                      ? "cursor-pointer hover:bg-[#1E293B]"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive
                      ? "bg-[#3B82F6] text-white"
                      : isCompleted
                      ? "bg-[#10B981] text-white"
                      : "bg-[#2D3B55] text-[#64748B]"
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-sm ${
                    isActive ? "text-[#F8FAFC] font-medium" : "text-[#94A3B8]"
                  }`}>
                    {step.title}
                  </span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto text-[#3B82F6]" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[#2D3B55] space-y-2">
          <Button
            variant="outline"
            className="w-full border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC]"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save as draft
          </Button>
          <Button
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB]"
            onClick={() => handleSave(false)}
            disabled={saving}
            data-testid="create-campaign-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isEdit ? "Update campaign" : "Create campaign"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Media Plan Banner */}
          {showPlanBanner && planData && (
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-[#10B981]/20 to-[#3B82F6]/20 border border-[#10B981]/30">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#10B981]/20">
                    <Sparkles className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#F8FAFC]">
                      Created from Media Plan
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Settings pre-filled based on your media plan recommendations
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] text-xs">
                        Budget: ${planData.total_budget?.toLocaleString()}
                      </Badge>
                      <Badge className="bg-[#10B981]/20 text-[#10B981] text-xs">
                        {planData.bidding_strategy?.replace(/_/g, ' ')}
                      </Badge>
                      {planData.forecast?.impressions && (
                        <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] text-xs">
                          Est. {(planData.forecast.impressions / 1000000).toFixed(1)}M impressions
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlanBanner(false)}
                  className="text-[#64748B] hover:text-[#F8FAFC] -mt-1 -mr-1"
                >
                  ×
                </Button>
              </div>
            </div>
          )}
          
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-[#2D3B55]">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="border-[#2D3B55] text-[#94A3B8]"
            >
              Previous
            </Button>
            <Button
              onClick={handleContinue}
              disabled={currentStep === STEPS.length}
              className="bg-[#3B82F6] hover:bg-[#2563EB]"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
