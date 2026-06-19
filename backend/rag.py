import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
PDF_PATH = os.path.join(os.path.dirname(__file__),"..","data","DEAP_Manual.pdf")
INDEX_PATH = os.path.join(os.path.dirname(__file__), "..", "deap_index")

embeddings = HuggingFaceEmbeddings(
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
)


def get_vector_store():
    if os.path.exists(INDEX_PATH):
        print("Loading existing index from disk...")
        return FAISS.load_local(
            INDEX_PATH,
            embeddings,
            allow_dangerous_deserialization= True
        )
    else:
        print("No index found. Building from PDF...")
        loader = PyPDFLoader(PDF_PATH)
        docs = loader.load()

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\nAppendix ", "\nSection ", "\n\n", "\n", " ", ""]
        )
        chunks = splitter.split_documents(docs)
        vector_store = FAISS.from_documents(chunks, embeddings)
        vector_store.save_local(INDEX_PATH)
        print(f"Index built and saved. Total chunks: {len(chunks)}")
        return vector_store
    
vector_store = get_vector_store()
retriever = vector_store.as_retriever(search_kwargs = {"k":5})
client = Groq(api_key=GROQ_API_KEY)

def ask(question: str) -> str:
    retrieved_docs = retriever.invoke(question)
    context = "\n\n".join(doc.page_content for doc in retrieved_docs)
    prompt = f"""You are Taz, an expert assistant for the DEAP (Dwelling Energy Assessment Procedure) manual published by SEAI Ireland.

Answer the question using ONLY the information in the context below.
If the answer is not in the context, say: "I could not find that in the DEAP manual."
Be clear and concise.

Context:
{context}

Question: {question}

Answer:"""
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=512,
        temperature=0.2
    )
    return response.choices[0].message.content.strip()


