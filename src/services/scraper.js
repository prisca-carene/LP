const axios = require('axios');
const cheerio = require('cheerio');
const metadataScraper = require('metadata-scraper');

async function scrapeUrl(url) {
  try {
    // Get metadata using metadata-scraper
    const metadata = await metadataScraper(url);
    
    // Fetch HTML content
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract headings
    const h1Tags = [];
    const h2Tags = [];
    
    $('h1').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text) h1Tags.push(text);
    });

    $('h2').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text) h2Tags.push(text);
    });

    // Extract meta description
    const metaDescription = $('meta[name="description"]').attr('content') || '';

    // Extract main image (try OG image first, then first image)
    const mainImage = metadata.image || $('img').first().attr('src') || '';

    // Extract keywords from meta tags
    const keywordsMeta = $('meta[name="keywords"]').attr('content') || '';
    const keywords = keywordsMeta.split(',').map(k => k.trim()).filter(k => k);

    return {
      title: metadata.title || $('title').text().trim(),
      description: metadata.description || metaDescription,
      h1Tags,
      h2Tags,
      mainImage,
      keywords,
      url: metadata.url || url
    };
  } catch (error) {
    console.error('Error scraping URL:', error);
    throw new Error('Failed to scrape URL');
  }
}

module.exports = { scrapeUrl };