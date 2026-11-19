import { speciesKey } from './model.mjs';

const catalogue = {
  'Winkelspinnen und Hausbewohner': [
    'Große Hauswinkelspinne (Eratigena atrica)',
    'Hauswinkelspinne (Tegenaria domestica)',
    'Eratigena duellica', 'Eratigena saeva', 'Eratigena agrestis',
    'Rostrote Winkelspinne (Tegenaria ferruginea)', 'Tegenaria parietina',
    'Große Zitterspinne (Pholcus phalangioides)', 'Kleine Zitterspinne (Pholcus opilionoides)',
    'Nosferatu-Spinne (Zoropsis spinimana)', 'Gewöhnliche Speispinne (Scytodes thoracica)',
    'Fenster-Kräuselspinne (Amaurobius fenestralis)', 'Amaurobius ferox', 'Amaurobius similis',
    'Mauer-Zebraspringspinne (Salticus scenicus)', 'Oonops domesticus',
  ],
  'Kreuzspinnen und andere Radnetzspinnen': [
    'Gartenkreuzspinne (Araneus diadematus)', 'Vierfleckkreuzspinne (Araneus quadratus)',
    'Marmorkreuzspinne (Araneus marmoreus)', 'Eichblatt-Radspinne (Aculepeira ceropegia)',
    'Gehörnte Kreuzspinne (Araneus angulatus)', 'Wespenspinne (Argiope bruennichi)',
    'Brückenkreuzspinne (Larinioides sclopetarius)', 'Schilfradspinne (Larinioides cornutus)',
    'Spaltenkreuzspinne (Nuctenea umbratica)', 'Sektorspinne (Zygiella x-notata)',
    'Kürbisspinne (Araniella cucurbitina)', 'Araniella opisthographa', 'Kreisspinne (Cyclosa conica)',
    'Mangora acalypha', 'Metellina segmentata', 'Metellina mengei', 'Große Höhlenspinne (Meta menardi)',
    'Tetragnatha extensa', 'Tetragnatha montana', 'Uloborus plumipes',
    'Argiope aurantia', 'Argiope argentata', 'Argiope lobata', 'Gasteracantha cancriformis',
    'Micrathena gracilis', 'Trichonephila clavipes', 'Trichonephila pilipes', 'Trichonephila inaurata',
  ],
  'Springspinnen': [
    'Königsspringspinne (Phidippus regius)', 'Phidippus audax', 'Phidippus apacheanus',
    'Phidippus cardinalis', 'Phidippus californicus', 'Phidippus clarus', 'Phidippus johnsoni',
    'Phidippus mystaceus', 'Phidippus otiosus', 'Phidippus princeps', 'Phidippus putnami',
    'Phidippus tyrelli', 'Hyllus diardi', 'Hyllus giganteus', 'Hyllus semicupreus',
    'Hasarius adansoni', 'Plexippus paykulli', 'Plexippus petersi', 'Menemerus bivittatus',
    'Menemerus semilimbatus', 'Cosmophasis umbratica', 'Portia fimbriata', 'Portia labiata',
    'Maevia inclemens', 'Habronattus coecatus', 'Maratus volans', 'Maratus speciosus',
    'Goldaugenspringspinne (Philaeus chrysops)', 'Pseudeuophrys lanigera', 'Attulus pubescens',
    'Euophrys frontalis', 'Evarcha arcuata', 'Evarcha falcata', 'Marpissa muscosa',
    'Myrmarachne formicaria', 'Sibianor aurocinctus',
  ],
  'Vogelspinnen': [
    'Mexikanische Rotknie-Vogelspinne (Brachypelma hamorii)', 'Brachypelma smithi',
    'Brachypelma auratum', 'Brachypelma boehmei', 'Brachypelma emilia', 'Brachypelma klaasi',
    'Brachypelma albiceps', 'Kraushaar-Vogelspinne (Tliltocatl albopilosus)',
    'Tliltocatl vagans', 'Tliltocatl kahlenbergi', 'Tliltocatl verdezi',
    'Rote Chile-Vogelspinne (Grammostola rosea)', 'Grammostola pulchra', 'Grammostola pulchripes',
    'Grammostola iheringi', 'Grammostola actaeon', 'Aphonopelma chalcodes', 'Aphonopelma hentzi',
    'Aphonopelma seemanni', 'Aphonopelma bicoloratum', 'Aphonopelma anax', 'Aphonopelma moderatum',
    'Chromatopelma cyaneopubescens', 'Acanthoscurria geniculata', 'Acanthoscurria brocklehursti',
    'Lasiodora parahybana', 'Lasiodora klugi', 'Nhandu chromatus', 'Nhandu coloratovillosus',
    'Nhandu tripepii', 'Theraphosa blondi', 'Theraphosa stirmi', 'Theraphosa apophysis',
    'Pamphobeteus antinous', 'Pamphobeteus machala', 'Pamphobeteus nigricolor',
    'Xenesthis immanis', 'Xenesthis intermedia', 'Xenesthis monstrosa',
    'Phormictopus cancerides', 'Phormictopus auratus', 'Megaphobema robustum', 'Sericopelma rubronitens',
    'Eupalaestrus campestratus', 'Homoeomma chilensis', 'Hapalopus formosus',
    'Citharacanthus cyaneus', 'Pterinopelma sazimai', 'Dolichothele diamantinensis',
    'Cyriocosmus elegans', 'Cyriocosmus leetzi', 'Cyriocosmus perezmilesi',
    'Davus pentaloris', 'Davus fasciatus', 'Davus ruficeps', 'Kochiana brunnipes',
    'Neoholothele incei', 'Holothele longipes', 'Bonnetina cyaneifemur',
    'Psalmopoeus irminia', 'Psalmopoeus cambridgei', 'Psalmopoeus reduncus', 'Psalmopoeus pulcher',
    'Avicularia avicularia', 'Avicularia minatrix', 'Avicularia purpurea', 'Avicularia juruensis',
    'Caribena versicolor', 'Caribena laeta', 'Ybyrapora diversipes', 'Ybyrapora gamba',
    'Tapinauchenius violaceus', 'Tapinauchenius plumipes', 'Pseudoclamoris gigas',
    'Poecilotheria regalis', 'Poecilotheria metallica', 'Poecilotheria ornata', 'Poecilotheria rufilata',
    'Poecilotheria fasciata', 'Poecilotheria formosa', 'Poecilotheria miranda',
    'Poecilotheria subfusca', 'Poecilotheria tigrinawesseli', 'Poecilotheria vittata',
    'Heteroscodra maculata', 'Stromatopelma calceatum', 'Pterinochilus murinus', 'Pterinochilus chordatus',
    'Pterinochilus lugardi', 'Harpactira pulchripes', 'Harpactira cafreriana', 'Harpactira dictator',
    'Ceratogyrus darlingi', 'Ceratogyrus marshalli', 'Ceratogyrus brachycephalus',
    'Pelinobius muticus', 'Hysterocrates gigas', 'Monocentropus balfouri',
    'Idiothele mira', 'Augacephalus ezendami', 'Chilobrachys fimbriatus', 'Chilobrachys natanicharum',
    'Chilobrachys huahini', 'Cyriopagopus lividus', 'Cyriopagopus minax', 'Cyriopagopus albostriatus',
    'Cyriopagopus hainanus', 'Cyriopagopus longipes',
    'Lampropelma nigerrimum', 'Omothymus violaceopes', 'Omothymus schioedtei',
    'Ornithoctonus aureotibialis', 'Selenocosmia javanensis',
    'Phlogius crassipes', 'Selenotypus plumipes',
  ],
  'Weitere Webspinnen': [
    'Listspinne (Pisaura mirabilis)', 'Gerandete Jagdspinne (Dolomedes fimbriatus)',
    'Dolomedes plantarius', 'Dolomedes tenebrosus', 'Wolfspinne (Pardosa amentata)',
    'Pardosa lugubris', 'Pardosa palustris', 'Alopecosa pulverulenta', 'Trochosa ruricola',
    'Trochosa terricola', 'Hogna radiata', 'Hogna carolinensis', 'Lycosa tarantula',
    'Veränderliche Krabbenspinne (Misumena vatia)', 'Synema globosum', 'Thomisus onustus',
    'Xysticus cristatus', 'Philodromus aureolus', 'Micrommata virescens', 'Heteropoda venatoria',
    'Heteropoda davidbowie', 'Sparassus walckenaeri', 'Cupiennius salei', 'Cupiennius getazi',
    'Wasserspinne (Argyroneta aquatica)', 'Dysdera crocata', 'Dysdera erythrina',
    'Steatoda grossa', 'Steatoda nobilis', 'Steatoda bipunctata', 'Steatoda triangulosa',
    'Parasteatoda tepidariorum', 'Enoplognatha ovata', 'Theridion varians',
    'Linyphia triangularis', 'Neriene radiata', 'Cheiracanthium punctorium',
    'Cheiracanthium mildei', 'Segestria florentina', 'Segestria senoculata',
    'Atypus affinis', 'Atypus piceus', 'Eresus kollari', 'Eresus sandaliatus',
    'Stegodyphus lineatus', 'Stegodyphus dumicola',
  ],
};

const spiderGroups = /^(spinnen?|vogelspinnen?|springspinnen?|webspinnen?|arachnida|araneae)$/;
export const isSpiderGroup = group => spiderGroups.test(speciesKey(group));
const matchesGroup = (left, right) => speciesKey(left) === speciesKey(right) || (isSpiderGroup(left) && isSpiderGroup(right));

export function speciesChoices(data, group) {
  const sections = !group || isSpiderGroup(group) ? Object.entries(catalogue) : [];
  const own = [];
  const seen = new Set(sections.flatMap(([, names]) => names.map(speciesKey)));
  for (const [label, entries] of [['Eigene Arten', (data.species ?? []).map(item => [item.group, item.name])], ['Bereits verwendete Arten', data.animals.map(animal => [animal.group, animal.species])]]) {
    const names = [];
    for (const [entryGroup, name] of entries) {
      const key = speciesKey(name);
      if (!key || seen.has(key) || (group && !matchesGroup(entryGroup, group))) continue;
      seen.add(key);
      names.push(name);
    }
    if (names.length) own.push([label, names]);
  }
  return [...own, ...sections].map(([label, names]) => [label, [...names].sort((left, right) => left.localeCompare(right, 'de'))]);
}