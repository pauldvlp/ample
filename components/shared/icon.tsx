import {
  HugeiconsIcon,
  type HugeiconsIconProps,
  type IconSvgElement,
} from "@hugeicons/react";
import { cn } from "@/lib/utils";
import {
  Wallet01Icon, PiggyBankIcon, CreditCardIcon, BanknoteIcon, Coins01Icon,
  AnalyticsUpIcon, TradeDownIcon, BankIcon, Briefcase01Icon, LaptopIcon,
  ChartLineData01Icon, PercentIcon, GiftIcon, ShoppingCart01Icon,
  ShoppingBag01Icon, Restaurant01Icon, Coffee01Icon, Home01Icon, EnergyIcon,
  Wifi01Icon, Bus01Icon, Car01Icon, FuelStationIcon, Airplane01Icon, Train01Icon,
  FavouriteIcon, HealthIcon, SecurityCheckIcon, Film01Icon, MusicNote01Icon,
  GameController01Icon, RepeatIcon, MortarboardIcon, DumbbellIcon, SparklesIcon,
  CatIcon, BabyBottleIcon, Invoice01Icon, SmartPhone01Icon, TShirtIcon,
  ScissorIcon, TreeIcon, Sun01Icon, UmbrellaIcon, Wrench01Icon, Book02Icon,
  Camera01Icon, PaintBoardIcon, Rocket01Icon, StarIcon, MoreHorizontalIcon,
  PlusSignIcon, CircleIcon, DollarCircleIcon, Plant01Icon, Tag01Icon,
} from "@hugeicons/core-free-icons";

/**
 * Dynamic icon component backed by Hugeicons. Keys are stable strings (also
 * persisted in the DB for categories/accounts/goals), each mapped to a
 * Hugeicons element — so switching icon libraries never touched stored data.
 */
const REGISTRY: Record<string, IconSvgElement> = {
  Wallet: Wallet01Icon,
  PiggyBank: PiggyBankIcon,
  CreditCard: CreditCardIcon,
  Banknote: BanknoteIcon,
  Coins: Coins01Icon,
  TrendingUp: AnalyticsUpIcon,
  TrendingDown: TradeDownIcon,
  Landmark: BankIcon,
  Briefcase: Briefcase01Icon,
  Laptop: LaptopIcon,
  LineChart: ChartLineData01Icon,
  Percent: PercentIcon,
  Gift: GiftIcon,
  ShoppingCart: ShoppingCart01Icon,
  ShoppingBag: ShoppingBag01Icon,
  Utensils: Restaurant01Icon,
  Coffee: Coffee01Icon,
  Home: Home01Icon,
  Zap: EnergyIcon,
  Wifi: Wifi01Icon,
  Bus: Bus01Icon,
  Car: Car01Icon,
  Fuel: FuelStationIcon,
  Plane: Airplane01Icon,
  Train: Train01Icon,
  HeartPulse: FavouriteIcon,
  Stethoscope: HealthIcon,
  ShieldCheck: SecurityCheckIcon,
  Clapperboard: Film01Icon,
  Music: MusicNote01Icon,
  Gamepad2: GameController01Icon,
  Repeat: RepeatIcon,
  GraduationCap: MortarboardIcon,
  Dumbbell: DumbbellIcon,
  Sparkles: SparklesIcon,
  PawPrint: CatIcon,
  Baby: BabyBottleIcon,
  HandHeart: FavouriteIcon,
  Receipt: Invoice01Icon,
  Phone: SmartPhone01Icon,
  Shirt: TShirtIcon,
  Scissors: ScissorIcon,
  TreePine: TreeIcon,
  Sun: Sun01Icon,
  Umbrella: UmbrellaIcon,
  Wrench: Wrench01Icon,
  Book: Book02Icon,
  Camera: Camera01Icon,
  Palette: PaintBoardIcon,
  Rocket: Rocket01Icon,
  Star: StarIcon,
  MoreHorizontal: MoreHorizontalIcon,
  Plus: PlusSignIcon,
  Circle: CircleIcon,
  CircleDollarSign: DollarCircleIcon,
  Sprout: Plant01Icon,
  Tag: Tag01Icon,
};

export type IconName = keyof typeof REGISTRY;

export function Icon({
  name,
  className,
  strokeWidth = 1.8,
  ...props
}: { name?: string | null } & Omit<HugeiconsIconProps, "icon" | "name">) {
  const el = (name && REGISTRY[name]) || CircleIcon;
  return (
    <HugeiconsIcon
      icon={el}
      color="currentColor"
      strokeWidth={strokeWidth}
      className={cn("hg-icon", className)}
      {...props}
    />
  );
}

export const ICON_NAMES = Object.keys(REGISTRY) as IconName[];
