import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

const NAME_OVERRIDES: Record<string, string> = {
  "Bar-Throated Apalis": "Bar-throated apalis",
  "Black-back Puffback": "Black-backed puffback",
  "Blackcollared Barbet": "Black-collared barbet",
  "Burchells Zebra": "Burchell's zebra",
  "Bushbuck": "Imbabala",
  "Egyptian Slit-faced Bat": "Egyptian slit-faced bat",
  "Flap-necked Chameleon": "Flap-necked chameleon",
  "Green Wood-hoopoe": "Green wood hoopoe",
  "Grey Hornbill": "African grey hornbill",
  "Lesser Savannah Dormouse": "Graphiurus parvus",
  "Longbilled Crombec": "Long-billed crombec",
  "Marko Sunbird": "Marico sunbird",
  "Olive Tree Warbler": "Olive-tree warbler",
  "Orb Spider": "Orb-weaver spider",
  "Pouched Mouse": "Pouched mouse",
  "Python": "African rock python",
  "Red Veldrat": "Aethomys ineptus",
  "Reddish-grey Musk Shrew": "Lesser red musk shrew",
  "Sharpes Greysbok": "Sharpe's grysbok",
  "Single-striped Mouse": "Single-striped grass mouse",
  "Small Spotted Genet": "Small-spotted genet",
  "Southern White-faced Scops Owl": "Southern white-faced owl",
  "Stierling's Wren Warbler": "Stierling's wren-warbler",
  "Tree Mouse": "Grammomys",
  "Velvet Mite": "Velvet mite",
  "Wahlbergs Epauletted Fruit Bat": "Wahlberg's epauletted fruit bat",
  "White-browed Scrub-chat": "White-browed robin-chat",
  "Woolly-necked Stork": "Ciconia episcopus",
};

async function fetchWikipediaThumbnail(name: string): Promise<string | null> {
  const encoded = encodeURIComponent(name.replace(/ /g, "_"));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as { thumbnail?: { source?: string } };
    return data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

async function searchWikipediaThumbnail(query: string): Promise<string | null> {
  const encoded = encodeURIComponent(query);
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srnamespace=0&srlimit=1&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      query?: { search?: { title: string }[] };
    };
    const title = data.query?.search?.[0]?.title;
    if (!title) return null;
    return fetchWikipediaThumbnail(title);
  } catch {
    return null;
  }
}

async function findImage(commonName: string): Promise<string | null> {
  const override = NAME_OVERRIDES[commonName];
  if (override) {
    const result = await fetchWikipediaThumbnail(override);
    if (result) return result;
  }

  const direct = await fetchWikipediaThumbnail(commonName);
  if (direct) return direct;

  return searchWikipediaThumbnail(commonName + " animal");
}

async function main() {
  const allSpecies = await prisma.species.findMany({
    orderBy: { commonName: "asc" },
  });
  const species = allSpecies.filter((s) => !s.imageUrl);

  console.log(`Found ${species.length} species without images`);

  let success = 0;
  let failed = 0;

  for (const s of species) {
    const imageUrl = await findImage(s.commonName);

    if (imageUrl) {
      await prisma.species.update({
        where: { id: s.id },
        data: { imageUrl },
      });
      success++;
      console.log(`[${success + failed}/${species.length}] ${s.commonName} -> found`);
    } else {
      failed++;
      console.log(`[${success + failed}/${species.length}] ${s.commonName} -> not found`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\nDone: ${success} images found, ${failed} not found`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
