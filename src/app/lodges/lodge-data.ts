export interface LodgeBrand {
  name: string;
  logoUrl: string;
  logoLight: boolean;
  accentColour: string;
  websiteUrl: string;
}

export interface LodgeShowcase {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  heroImages: string[];
  capacity: string;
  location: string;
  brand: LodgeBrand;
}

export const LODGE_DATA: LodgeShowcase[] = [
  {
    slug: "nzumba",
    name: "Nzumba Camp",
    tagline: "Colonial charm on the Klaserie River",
    description:
      "Nestled in the remote northwestern region of the Klaserie Private Nature Reserve, Nzumba Camp traverses 7,000 hectares of pristine bushveld nourished by the iconic Klaserie River. Five luxurious thatched chalets overlook flowing lawns, a sparkling pool, and a nearby waterhole frequented by elephant, lion, leopard and rhino. The elegant main lodge — complete with leather lounges, safari memorabilia and an upstairs bar — echoes the romance of a bygone era.",
    highlights: [
      "Big Five traversing area",
      "Exclusive 7,000 ha concession",
      "Waterhole-facing suites",
      "Open 4x4 game drives & bush walks",
      "Klaserie River frontage",
    ],
    heroImages: ["/hero-elephants.jpg", "/images/mammals.jpg", "/hero-rhinos.webp"],
    capacity: "10 guests in 5 thatched chalets",
    location: "North-western Klaserie Private Nature Reserve",
    brand: {
      name: "Klaserie Camps",
      logoUrl: "https://klaseriecamps.com/wp-content/uploads/2021/03/Untitled-1.png",
      logoLight: true,
      accentColour: "#f7ca3b",
      websiteUrl: "https://klaseriecamps.com/",
    },
  },
  {
    slug: "kitara",
    name: "Last Word Kitara",
    tagline: "Remote Big Five river sanctuary",
    description:
      "Last Word Kitara is a five-star river sanctuary on the banks of the Klaserie River in the Greater Kruger. Six spacious 70 m² suites offer sweeping views of the pristine river — a common footpath for much of the local wildlife. The epitome of 'beyond boutique', every suite features Victorian baths, indoor and outdoor showers, private patios and fully stocked gin bars. Morning and afternoon game drives provide unrushed Big Five encounters, while guided bush walks and scenic helicopter flights complete the soul safari experience.",
    highlights: [
      "Big Five river sanctuary",
      "Six 70 m² luxury suites",
      "Indoor & outdoor showers with private patios",
      "Twice-daily game drives & bush walks",
      "Scenic helicopter flights available",
    ],
    heroImages: [
      "/images/kitara/river-sunrise.avif",
      "/images/kitara/leopard-queen.avif",
      "/images/kitara/suite-patio.avif",
    ],
    capacity: "12 guests in 6 luxury suites",
    location: "Klaserie River, Greater Kruger",
    brand: {
      name: "The Last Word",
      logoUrl: "https://cdn.prod.website-files.com/5f9fdaba11f1bd323cd8af8a/5fa5651781f83e2da28083b5_logo-lastword-kitara.svg",
      logoLight: true,
      accentColour: "#e19e68",
      websiteUrl: "https://thelastword.co.za/hotel/kitara",
    },
  },
];

export function getLodgeBySlug(slug: string): LodgeShowcase | undefined {
  return LODGE_DATA.find((l) => l.slug === slug);
}
