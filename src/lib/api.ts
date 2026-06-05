import * as xlsx from 'xlsx';
import { customSequences } from '../data/oeis-custom';
import { XMLParser } from 'fast-xml-parser';


// Fetch OEIS Data
export async function getOEISData(author = 'Vincenzo Manto') {
  const baseUrl = `https://oeis.org/search?q=author:%22${encodeURIComponent(author)}%22&fmt=json`;


  async function fetchOeisPage(start) {
    const targetUrl = `${baseUrl}&start=${start}`;
    const proxyUrl = `https://cors.io/?url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`Error ${start}`);
    const wrapper = await response.json();
    return JSON.parse(wrapper.body);
  }

  async function loadAllSequences() {
    try {
      let allResults: any[] = [];
      let i = 0;

      let lastCount = 0;
      do {
        const firstPageData = await fetchOeisPage(i++ * 10);

        if (firstPageData) {
          allResults = allResults.concat(firstPageData);
          lastCount = firstPageData.length;
        } else {
          lastCount = 0;
        }

        if (lastCount < 10) break;
      } while (true);

      return allResults;
    } catch (error) {
      return [];
    }
  }

  // Avvia il caricamento automatico all'apertura della pagina
  return loadAllSequences();
}

async function getImage(subjectId: string): Promise<string[]> {
  const base = 'https://www.zooniverse.org/';
  const endpoint = 'api/subjects/';
  const id = subjectId;

  const url = base + endpoint + id;

  return new Promise((r) =>
    fetch(url, {
      method: 'GET',
      headers: {
        // ⚠️ FONDAMENTALE: Dice a Panoptes quale specifica versione dell'API usare
        Accept: 'application/vnd.api+json; version=1',
        'Content-Type': 'application/json',
      },
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Errore di rete: ' + response.status + ' ' + response.statusText);
        }
        return response.json();
      })
      .then(function (data) {
        if (!data.subjects || data.subjects.length === 0) {
          throw new Error('Nessun subject trovato per questo ID.');
        }

        // Estrae il primo elemento dall'array dei subject
        const subject = data.subjects[0];

        // Mappa le locazioni estraendo i valori degli URL
        const imageUrls = subject.locations.map(function (loc) {
          const mimeType = Object.keys(loc)[0];
          return loc[mimeType];
        });

        r(imageUrls);
      })
      .catch(function (error) {
        console.error('Si è verificato un errore:', error.message);
      }),
  );
}

function explainCategory(category: string): string {
  switch (category) {
    case 'MBA II':
      return 'Main Belt Asteroid (Middle)';
    case 'Inner MBA':
      return 'Main Belt Asteroid (Inner)';
    case 'MBA':
      return 'Main Belt Asteroid';
    case 'NEO':
      return 'Near-Earth Object';
    case 'TNO':
      return 'Trans-Neptunian Object';
    case 'Comet':
      return 'Comet';
    case 'Satellite':
      return 'Satellite';
    default:
      return category ? category.replace(/MBA/g, 'Main Belt Asteroid').replace(/NEO/g, 'Near-Earth Object').replace(/TNO/g, 'Trans-Neptunian Object') : category;
  }
}

export async function getArxivPapers(query = 'au:"V. Manto" OR au:"Vincenzo Manto"', maxResults = 10) {
  const baseUrl = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&max_results=${maxResults}`;

  try {
    const response = await fetch(baseUrl);
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    
    const text = await response.text();
    
    // Configura il parser XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    
    const jsonObj = parser.parse(text);
    const entries = Array.isArray(jsonObj.feed.entry) ? jsonObj.feed.entry : [jsonObj.feed.entry];
    return entries.filter(e => e).map((entry: any) => ({
      title: entry.title || '',
      // Gestisce il caso in cui ci sia un solo autore o un array di autori
      authors: Array.isArray(entry.author) 
        ? entry.author.map((a: any) => a.name) 
        : [entry.author.name],
      summary: entry.summary || '',
      date: entry.published || '',
      link: entry.id || '',
    }));
  } catch (error) {
    console.error('Error fetching arXiv papers:', error);
    return [];
  }
}
export async function getScholarPapers() {
  const url = 'https://scholar.google.com/citations?user=FIWfidAAAAAJ';

  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Dato che sei in ambiente node, usa 'cheerio' o il parser interno di jsdom 
    // Se non vuoi dipendenze, ecco come correggere la regex per essere più permissiva:
    
    const rowRegex = /<tr class="gsc_a_tr">([\s\S]*?)<\/tr>/g;
    const rows = Array.from(html.matchAll(rowRegex));

    const papers = rows.map(rowMatch => {
      const rowContent = rowMatch[1];
      
      // Estrai Titolo
      const titleMatch = rowContent.match(/class="gsc_a_at">(.*?)<\/a>/);
      const title = titleMatch ? titleMatch[1] : 'No title';
      
      // Estrai Link
      const linkMatch = rowContent.match(/href="([^"]+)"/);
      const link = (linkMatch?.[1] ? `https://scholar.google.com/${linkMatch[1]}` : '#').replace(/&amp;/g, '&');
      
      // Estrai Anno
      const yearMatch = rowContent.match(/class="gsc_a_h gsc_a_hc gs_ibl">(.*?)<\/span>/);
      const year = yearMatch ? yearMatch[1] : 'N/A';

      const infos = rowContent.replace(/<.*?>/g, ' ').replace(title, '').trim()

      return { title, link, date: year, abstract: infos };
    });

    return papers;
  } catch (error) {
    console.error('Errore parsing Scholar:', error);
    return [];
  }
}
export async function getPapers() {
  const promises = [getArxivPapers(), getScholarPapers()];
  const [arxivPapers, scholarPapers] = await Promise.all(promises);
  const allPapers = [...arxivPapers, ...scholarPapers];
  // Rimuove duplicati basati sul titolo
  const uniquePapers = Array.from(new Map(allPapers.map(paper => [paper.title, paper])).values());
  return uniquePapers;
}

export async function getOEISDataFull() {
  const data = await getOEISData();
  const drafts = await getDraftOEISData();
  const allData = [...data, ...drafts];
  return allData.map((seq: any) => {
    const id = `A${seq.number}`;
    return {
      params: { id },
      props: { seq, custom: customSequences[id as keyof typeof customSequences] || {} },
    };
  });
}

export async function getDraftOEISData(author = 'Vincenzo Manto') {
  const baseUrl = `https://oeis.org/draft?user=${encodeURIComponent(author)}&fmt=json`;
  // no need for pagination here since drafts are usually few
  const proxyUrl = `https://cors.io/?url=${encodeURIComponent(baseUrl)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`Error fetching drafts: ${response.status} ${response.statusText}`);
    const wrapper = await response.json();
    return JSON.parse(wrapper.body)?.list?.map(e => e.sequence).map((seq: any) => ({ ...seq, draft: true })) || [];
  } catch (error) {
    console.error('Error fetching OEIS drafts:', error);
    return [];
  }
}
  

// Fetch Google Sheets Data
export async function getMinorPlanetData() {
  // Using the /pub?output=xlsx endpoint instead of pubhtml for robust parsing
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQiLSdEB13Ae0xwnPeYOQdzA_V7E1i56knQWkJZdWxfl6m2hcjhm1uJhK2WWMeUh1Y9x8yD0UZgH6kS/pub?output=xlsx';

  try {
    const res = await fetch(csvUrl);
    const arrayBuffer = await res.arrayBuffer();
    const workbook = xlsx.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[workbook.SheetNames.length - 2]; // Assuming data is in the last sheet
    const sheet = workbook.Sheets[sheetName];
    const result = xlsx.utils.sheet_to_json(sheet);
    console.log(workbook.SheetNames)
    // Filter to only rows where username contains Manto / Vincenzo Manto
    // (Adjust the field names based on actual headers)
    const mentions: any[] = result.filter((row: any) => {
      const user = (row['Username'] || '').toLowerCase();
      return user.includes('manto') || user.includes('vincenzo');
    });
    const promises = mentions.map(async (mention) => {
      const subjectId = mention['Subject ID'];
      mention['Category'] = explainCategory(mention['Category']);

      if (subjectId) {
        try {
          const images = await getImage(subjectId);
          mention['Thumbnails'] = images || [];
        } catch (e) {
          console.error(`Errore API per Subject ID ${subjectId}:`, e);
          mention['Thumbnails'] = [];
        }
      } else {
        mention['Thumbnails'] = null;
      }
    });

    await Promise.all(promises);
    return mentions;
  } catch (e) {
    console.error('Error fetching Minor Planet data:', e);
    return [];
  }
}

// Fetch Zooniverse Discussions
export async function getZooniverseDiscussions(boardId = 6403) {
  const url = `https://panoptes.zooniverse.org/api/discussions?board_id=${boardId}&sort=-created_at`;
  const headers = {
    Accept: 'application/vnd.api+json; version=1',
  };

  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    return data.discussions || [];
  } catch (e) {
    console.error('Error fetching Zooniverse discussions:', e);
    return [];
  }
}

// Fetch Zooniverse Comments for a specific discussion
export async function getZooniverseComments(discussionId: string) {
  const url = `https://panoptes.zooniverse.org/api/comments?discussion_id=${discussionId}&page_size=50`;
  const headers = {
    Accept: 'application/vnd.api+json; version=1',
  };

  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    return data.comments || [];
  } catch (e) {
    console.error('Error fetching Zooniverse comments:', e);
    return [];
  }
}
