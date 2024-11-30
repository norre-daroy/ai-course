import fetch from 'node-fetch' // Import fetch for Node.js
import xml2js from 'xml2js' // Import xml2js for XML parsing
import dotenv from 'dotenv'
// import PdfQuery from './pdfQa.js'

dotenv.config()

const fetchPubMedData = async (searchTerm) => {
  const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
  const params = new URLSearchParams({
    db: 'pubmed',
    term: searchTerm,
    retmode: 'xml',
    api_key: process.env.PUBMED_API_KEY, // Replace with your NCBI API key
  })

  const url = `${baseUrl}?${params.toString()}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const xmlData = await response.text()
    const parser = new xml2js.Parser()
    const xmlDoc = await parser.parseStringPromise(xmlData)
    const ids = xmlDoc.eSearchResult.IdList[0].Id // Access Ids correctly
    return ids
  } catch (error) {
    console.error('Error fetching data from PubMed:', error)
    return []
  }
}

const fetchPubMedArticle = async (articleId) => {
  const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi'
  const params = new URLSearchParams({
    db: 'pubmed',
    id: articleId,
    retmode: 'xml',
    api_key: process.env.PUBMED_API_KEY, // Replace with your NCBI API key
  })

  const url = `${baseUrl}?${params.toString()}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const xmlData = await response.text()
    const parser = new xml2js.Parser()
    const xmlDoc = await parser.parseStringPromise(xmlData)

    // // Log the entire xmlDoc for debugging
    // console.log(
    //   'Parsed XML Document:',
    //   JSON.stringify(
    //     xmlDoc.PubmedArticleSet.PubmedArticle[0].MedlineCitation[0].Article[0]
    //       .ELocationID[0]['_'],
    //     null,
    //     2
    //   )
    // )

    // Check if PubmedArticle exists and has elements
    if (
      xmlDoc.PubmedArticleSet.PubmedArticle &&
      xmlDoc.PubmedArticleSet.PubmedArticle.length > 0
    ) {
      const elocationid =
        xmlDoc.PubmedArticleSet.PubmedArticle[0].MedlineCitation[0].Article[0]
          .ELocationID[0]['_']
      // Check if elocationid exists and has elements
      if (elocationid) {
        const doi = elocationid // Get the DOI
        // console.log('DOI:', doi) // Log the DOI value

        const articleLink = `https://doi.org/${doi}`
        return articleLink // Construct the PDF link using DOI
      } else {
        console.log('No ELocationID found in the article.')
      }
    } else {
      console.log(
        'No PubmedArticle found in the XML document for article ID:',
        articleId
      )
    }

    // If no PDF link is found, return null
    return null
  } catch (error) {
    console.error('Error fetching article from PubMed:', error)
    return null
  }
}

// Example usage
const fetchPdfsByTopic = async (topic) => {
  const articleIds = await fetchPubMedData(topic)
  const pdfLinks = []

  for (const id of articleIds) {
    const pdfLink = await fetchPubMedArticle(id)
    if (pdfLink) {
      pdfLinks.push(pdfLink)
    }
  }

  console.log('Article Ids', articleIds)
  console.log('PDF Links:', pdfLinks)

  // TODO: Run functino when pdf links are in pdf format
  // PdfQuery(pdfLinks)
}

// Call the function with a specific topic
fetchPdfsByTopic('myasthenia gravis')
