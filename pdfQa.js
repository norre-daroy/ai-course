import { openai } from './openai.js'
import { Document } from 'langchain/document'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { OpenAIEmbeddings } from '@langchain/openai'
import { CharacterTextSplitter } from 'langchain/text_splitter'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { YoutubeLoader } from '@langchain/community/document_loaders/web/youtube'

const question = process.argv[2] || 'myasthenia gravis'

export const createStore = (docs) =>
  MemoryVectorStore.fromDocuments(docs, new OpenAIEmbeddings())

export const docsFromYTVideo = async (video) => {
  const loader = YoutubeLoader.createFromUrl(video, {
    language: 'en',
    addVideoInfo: true,
  })
  return loader.loadAndSplit(
    new CharacterTextSplitter({
      separator: ' ',
      chunkSize: 2500,
      chunkOverlap: 100,
    })
  )
}

export const docsFromPDF = (file) => {
  const loader = new PDFLoader(file)
  return loader.loadAndSplit(
    new CharacterTextSplitter({
      separator: '. ',
      chunkSize: 2500,
      chunkOverlap: 200,
    })
  )
}

const loadStore = async (pdfFile) => {
  let pdfDocs
  console.log('PDF File', pdfFile)
  // Check if the pdfFile is a URL or a local file
  try {
    if (pdfFile.startsWith('http://') || pdfFile.startsWith('https://')) {
      // Load PDF from URL
      const response = await fetch(pdfFile)
      const blob = await response.blob()
      const file = new File([blob], 'temp.pdf') // Create a temporary file
      pdfDocs = await docsFromPDF(file)
      console.log(blob)
    } else {
      // Load PDF from local file
      pdfDocs = await docsFromPDF(pdfFile)
    }
  } catch (error) {
    console.error(
      `Error loading PDF file: ${pdfFile}. Reason: ${error.message}`
    )
    return null // Return null or handle the error as needed
  }

  return createStore([...pdfDocs])
}

const query = async () => {
  const pdfFiles = [
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC8196750/pdf/jcm-10-02235.pdf',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC10767470/pdf/cureus-0015-00000050017.pdf',
  ]

  for (let index = 0; index < pdfFiles.length; index++) {
    const pdfFile = pdfFiles[index]
    const store = await loadStore(pdfFile)
    const results = await store.similaritySearch(question, 1)

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0,
      messages: [
        {
          role: 'assistant',
          content:
            'You are a helpful AI assistant. Answer questions to your best ability.',
        },
        {
          role: 'user',
          content: `Answer the following question using the provided context. If you cannot answer the question with the context, don't lie and make up stuff. Just say you need more context. List the symptoms and barriers in an itemized bulleted list exactly as stated in the pdf file.
          Question: Identify symptoms or barriers of the disease ${question}
    
          Context: ${results.map((r) => r.pageContent).join('\n')}`,
        },
      ],
    })

    console.log(
      `${index + 1}. PDF file: ${results
        .map((r) => r.metadata.source)
        .join(', ')}\nAnswer:\n${response.choices[0].message.content}\n\n`
    )
  }
}

query()