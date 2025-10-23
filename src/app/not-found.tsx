import Link from "next/link"

export default function Notfound(){
    return(
        <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-center font-bold mt-9 text-2xl">Página 404 não encontrada!</h1>
            <p>Essa página que tentou acessar não existe!</p>

            <Link className="font-bold" href="/">
                Voltar para home
            </Link>
        </div>
    )
}