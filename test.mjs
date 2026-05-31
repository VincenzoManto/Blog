// Using native fetch
import Papa from 'papaparse';

async function testSheets() {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQiLSdEB13Ae0xwnPeYOQdzA_V7E1i56knQWkJZdWxfl6m2hcjhm1uJhK2WWMeUh1Y9x8yD0UZgH6kS/pub?output=csv';
  console.log("Fetching sheets from", csvUrl);
  const res = await fetch(csvUrl);
  const text = await res.text();
  const result = Papa.parse(text, { header: true });
  console.log("Sheet Headers:", result.meta.fields);
  const mentions = result.data.filter((row) => {
      const user = (row['Username'] || '').toLowerCase();
      return user.includes('manto') || user.includes('vincenzo');
  });
  console.log(`Found ${mentions.length} mentions in sheets.`);
  if (mentions.length > 0) {
      console.log(mentions[0]);
  }
}

async function testZooniverse() {
    const url = `https://panoptes.zooniverse.org/api/discussions?board_id=6403&sort=-created_at`;
    const headers = { 'Accept': 'application/vnd.api+json; version=1' };
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log(`Found ${data.discussions ? data.discussions.length : 0} discussions`);
    if (data.discussions && data.discussions.length > 0) {
        console.log("Latest discussion title:", data.discussions[0].title);
        const resultDisc = data.discussions.find(d => d.title.toLowerCase().includes('result'));
        if (resultDisc) {
            console.log("Result discussion id:", resultDisc.id);
        } else {
            console.log("No result discussion found. Titles are:", data.discussions.map(d=>d.title).join(', '));
        }
    }
}

testSheets().then(() => testZooniverse()).catch(console.error);
