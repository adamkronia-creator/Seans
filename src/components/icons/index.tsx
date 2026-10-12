import type { ComponentType } from 'react';
import {
  Armchair,
  BatteryCharging,
  ArrowLeftRight,
  Bell,
  Bold,
  Bookmark,
  Brain,
  BrainCog,
  Briefcase,
  Calendar,
  CalendarDays,
  CalendarSearch,
  Camera,
  Captions,
  ChartPie,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleArrowRight,
  CircleCheck,
  CircleEllipsis,
  CirclePlay,
  CircleX,
  ClipboardCheck,
  ClipboardList,
  ClipboardPlus,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  Clock,
  Copy,
  Crown,
  Drama,
  ExternalLink,
  Eye,
  EyeOff,
  FaceSlightlyFrowning,
  FileSearch,
  FileText,
  FingerprintPattern,
  Flame,
  Frown,
  Handbag,
  HandHeart,
  Heart,
  HeartPulse,
  Hospital,
  Hourglass,
  Image,
  Italic,
  Laugh,
  Layers,
  Lightbulb,
  List,
  ListChecks,
  ListOrdered,
  Lock,
  Mail,
  Map,
  MapPin,
  MapPinned,
  Meh,
  MessageCircleMore,
  MessageSquareQuote,
  MirrorRound,
  Mic,
  NotebookPen,
  NotebookText,
  Palette,
  PanelTop,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  Quote,
  Redo2,
  RefreshCw,
  Reply,
  RotateCcw,
  Search,
  Send,
  Settings,
  Shapes,
  Signpost,
  Skull,
  Smile,
  Split,
  SquareArrowDown,
  Star,
  Stethoscope,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  User,
  Users,
  UsersRound,
  Wallet,
  X,
  Zap,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

/*
 * Все значки приложения — из набора Lucide (lucide.dev), вручную ничего не рисуется.
 * Здесь они собраны под именами, которыми пользуется приложение: любой значок меняется в одном месте.
 * Размер задаётся кеглем (1em), цвет — цветом текста (currentColor), толщина линии — одна на весь набор.
 */

export type IconProps = Omit<LucideProps, 'ref'>;
export type IconComponent = ComponentType<IconProps>;

/** Толщина линии на сетке 24. В Lucide по умолчанию 2; на 1,75 значки рядом с текстом выглядят легче и аккуратнее */
const STROKE = 1.75;

/** Красное сердечко избранного (прежнее #FF383C с прозрачностью 80% на белом) */
const HEART_RED = '#FF6063';

/** Значок Lucide под размер шрифта; `preset` — особенности конкретного значка (заливка, цвет, обрезка поля) */
function make(Glyph: LucideIcon, preset: IconProps = {}): IconComponent {
  return function AppIcon(props) {
    return <Glyph size="1em" strokeWidth={STROKE} {...preset} {...props} />;
  };
}

// ——— Значки, которые встречаются в нескольких местах под разными именами ———
export const IconPlusLine = make(Plus);
export const IconCheck = make(Check);
export const IconClose = make(X);
export const IconEdit = make(Pencil);
export const IconCopy = make(Copy);
export const IconClock = make(Clock);
export const IconLock = make(Lock);
export const IconEye = make(Eye);
export const IconPin = make(Pin);
export const IconFile = make(FileText);
export const IconFlame = make(Flame);
export const IconStar = make(Star);
export const IconBriefcase = make(Briefcase);
export const IconBookmark = make(Bookmark);
export const IconUser = make(User);
export const IconSettings = make(Settings);
export const IconMicrophone = make(Mic);
export const IconCircleX = make(CircleX);
export const IconCircleCheck = make(CircleCheck);
export const IconCircleAlert = make(CircleAlert);
export const IconChevronRight = make(ChevronRight);
export const IconChevronDown = make(ChevronDown);
export const IconChevronUp = make(ChevronUp);
export const IconClipboardList = make(ClipboardList);

// ——— Нижняя панель ———
export const IconPlanner = make(CalendarDays);
export const IconMessages = make(Mail);
export const IconTests = IconClipboardList;
// В Lucide нет человека в позе лотоса, который был у «Заданий»: подходит тетрадь с ручкой (дневники, листы заданий)
export const IconTasks = make(NotebookPen);
export const IconProfile = IconUser;

// ——— Общие ———
export const IconSearch = make(Search);
export const IconBell = make(Bell);
export const IconFavorites = IconBookmark;
export const IconBack = make(ChevronLeft);
export const IconTrash = make(Trash2);
export const IconReply = make(Reply);
export const IconEyeOff = make(EyeOff);
export const IconCalendar = make(Calendar);
export const IconUndo = make(RotateCcw);

// Плюс на кнопках и в чипсе «+»: линии идут во всё поле значка, как у прежнего, поэтому поле обрезано по краям плюса
// (иначе плюс в размер кнопки вышел бы мельче), и линия чуть толще
export const IconPlus = make(Plus, { viewBox: '4 4 16 16', strokeWidth: 2 });
export const IconPlusChip = IconPlus;

// ——— Открытый чат ———
export const IconAttach = make(Paperclip);
export const IconEmoji = make(Smile);
export const IconSend = make(Send);
export const IconReadTicks = make(CheckCheck, { color: '#fff' });
export const IconTickSingle = IconCheck;
export const IconTabBooking = make(Armchair);

// ——— Запись на прием ———
export const IconBookingPin = make(MapPin);
// «Показать на карте» — карта, «В картах» — карта с меткой
export const IconBookingRoute = make(Map);
export const IconBookingInMaps = make(MapPinned);
export const IconBookingCopy = IconCopy;
export const IconBookingWallet = make(Wallet);
// «Как пройти» — указатель на развилке, «Что принести» — сумка
export const IconBookingDirections = make(Signpost);
export const IconBookingBag = make(Handbag);
export const IconBookingCalendar = make(CalendarSearch);
export const IconBookingExternal = make(ExternalLink);
// Статусы в истории приемов: по форме видно, чем кончилось, даже без цвета
export const IconBookingDone = IconCircleCheck;
export const IconBookingCancelled = IconCircleX;
export const IconBookingMoved = make(CircleArrowRight);
export const IconBookingPending = IconClock;

// ——— Вкладка «Кейс» ———
// Карандаш «изменить» в карточках лёгкий и небольшой: поле шире значка, поэтому рисунок занимает около двух третей
export const IconCaseEdit = make(Pencil, { viewBox: '-3 -3 30 30' });
export const IconCaseLock = IconLock;
export const IconCaseFileDownload = make(SquareArrowDown);
// Значки шапок карточек (HEAD_ICONS в ChatCase/caseIcons.ts)
export const IconCaseGeneral = IconUser;
export const IconCaseAnamnesis = IconFile;
export const IconCaseRequest = make(HandHeart);
export const IconCaseHypothesis = make(Lightbulb);
export const IconCaseStructure = make(Layers);
export const IconCaseSignifiers = make(MessageCircleMore);
export const IconCaseScenario = make(RefreshCw);
export const IconCaseTransfer = make(ArrowLeftRight);
export const IconCaseNotePin = IconPin;
export const IconCaseHeadEye = IconEye;
export const IconCaseHeadStar = IconStar;
export const IconCaseHeadInfo = IconCircleAlert;
export const IconCaseHeadHospital = make(Hospital);
export const IconCaseHeadCrown = make(Crown);
export const IconCaseHeadBolt = make(Zap);
export const IconCaseHeadCross = IconCircleX;
export const IconCaseHeadDots = make(CircleEllipsis);
export const IconCaseHeadChecklist = make(ClipboardCheck);
export const IconCaseHeadFlame = IconFlame;
export const IconCaseHeadBriefcase = IconBriefcase;
export const IconCaseHeadBookmark = IconBookmark;

// ——— История взаимодействия: сами значки без плашки (цветную плашку рисует ChatHistory.css) ———
export const IconEventInvite = IconPlusLine;
export const IconTlNote = IconPin;
export const IconTlDoc = IconFile;
export const IconTlFlame = IconFlame;
export const IconTlClock = IconClock;
export const IconChevron = IconChevronRight;

// ——— Тесты и задания ———
// Сердечко избранного: закрашенное; красное — в избранном, серое (цвет текста) — нет
export const IconHeartRed = make(Heart, { color: HEART_RED, fill: HEART_RED });
export const IconHeartGray = make(Heart, { fill: 'currentColor' });
export const IconHeartRedLg = IconHeartRed;
export const IconHeartGrayLg = IconHeartGray;
export const IconFilterAll = IconBriefcase;
export const IconFilterFavorites = make(Heart);
export const IconFilterRecent = IconClock;
export const IconFilterSettings = IconSettings;

export const IconTestChevron = IconChevronRight;
export const IconTestChevronDown = IconChevronDown;
export const IconTestMic = IconMicrophone;
export const IconTestPass = make(CirclePlay);
// «Отправить» — бумажный самолётик, как и в чате; «Отправить нескольким» — несколько человек
export const IconTestSend = IconSend;
export const IconTestSendMany = make(Users);
export const IconTestReportMain = IconClipboardList;
export const IconTestReportExtra = make(ClipboardPlus);

// Рисунок теста или задания: на цветной плитке в карточках библиотеки и чата и в шапке настроек.
// Подобраны по смыслу методики (в Lucide нет готовых «психологических» картинок)
export const IconLibSmol = make(Drama); // СМОЛ: личность с разными «масками»
export const IconLibBhs = make(CloudRain); // безнадежность: мрачный прогноз
export const IconLibSq = make(FingerprintPattern); // Леонгард–Шмишек: особенности личности
export const IconLibItt = make(HeartPulse); // тревожность
export const IconLibBdi = make(CloudDrizzle); // депрессия (Бек)
export const IconLibIto = make(UsersRound); // Собчик: типы личности
export const IconLibOcr = make(Skull); // суицидальный риск
export const IconLibPhq9 = make(CloudLightning); // депрессивное состояние
export const IconLibGad7 = make(BrainCog); // генерализованное тревожное расстройство
export const IconLibRses = make(MirrorRound); // самооценка: взгляд на себя
export const IconLibPfq = make(Brain); // пятифакторный опросник личности
export const IconLibScl90 = make(Stethoscope); // клиническая симптоматика
export const IconLibEvidence = make(FileSearch); // поиск доказательств
export const IconLibPie = make(ChartPie); // пирог ответственности
export const IconLibSmer = make(NotebookText); // дневник СМЭР
export const IconLibActivation = make(BatteryCharging); // поведенческая активация
export const IconLibWorry = make(Hourglass); // отложенное беспокойство
export const IconLibShould = make(ListChecks); // «что я должен?»
export const IconLibChoice = make(Split); // выбор без правильного ответа
export const IconLibPhrase = make(MessageSquareQuote); // запомнившаяся фраза
export const IconLibSecret = make(EyeOff); // «если никто не узнает»

// Шкала состояния («Как вы себя чувствуете?»): пять лиц от «очень плохо» до «очень хорошо»
const FACES: LucideIcon[] = [Frown, FaceSlightlyFrowning, Meh, Smile, Laugh];
export function IconTaskState({ level, ...props }: { level: number } & IconProps) {
  const Face = FACES[level] ?? Meh;
  return <Face size="1em" strokeWidth={STROKE} {...props} />;
}

// ——— Окно редактирования: строки «Иконка» и «Цвет» ———
export const IconSheetIcon = make(Shapes);
export const IconSheetPalette = make(Palette);

// ——— Профиль ———
export const IconCamera = make(Camera);
export const IconPencil = IconEdit;
export const IconImage = make(Image);
export const IconCover = make(PanelTop);
export const IconCaption = make(Captions);

// ——— Инструменты форматирования текста ———
export const IconFmtBold = make(Bold);
export const IconFmtItalic = make(Italic);
export const IconFmtUnderline = make(Underline);
export const IconFmtStrike = make(Strikethrough);
export const IconFmtBullets = make(List);
export const IconFmtNumbers = make(ListOrdered);
export const IconFmtQuote = make(Quote);
export const IconFmtUndo = make(Undo2);
export const IconFmtRedo = make(Redo2);
