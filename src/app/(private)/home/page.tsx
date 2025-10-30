import { Utensils, Clock, Users, File } from "lucide-react"
import banner from "@/assets/banner.png"
import Image from "next/image";
import Link from "next/link";

export default function Page() {
  return (
    <div className="h-screen flex justify-center items-center flex-1 flex-col gap-8">
      <Image
        src={banner}
        alt="banner"
        className=" bg-muted/50 max-w-xl rounded-xl shadow-lg"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
        <Link href="/funcionarios" className="flex justify-center items-center flex-col aspect-video rounded-2xl border border-green-800/20 hover:border-green-900/50 transition-all duration-300 cursor-pointer hover:scale-105 hover:bg-transparent shadow-lg hover:shadow-xl backdrop-blur-sm">
          <Users size={48} className="mb-2 transition-colors duration-300" />
          <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors duration-300">Funcionários</span>
        </Link>

        <Link href="/ponto" className="flex justify-center items-center flex-col aspect-video rounded-2xl border border-green-800/20 hover:border-green-900/50 transition-all duration-300 cursor-pointer hover:scale-105 hover:bg-transparent shadow-lg hover:shadow-xl backdrop-blur-sm">
          <Clock size={48} className="mb-2 transition-colors duration-300" />
          <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors duration-300">Ponto</span>
        </Link>

        <Link href="/vale-alimentacao" className="flex justify-center items-center flex-col aspect-video rounded-2xl border border-green-800/20 hover:border-green-900/50 transition-all duration-300 cursor-pointer hover:scale-105 hover:bg-transparent shadow-lg hover:shadow-xl backdrop-blur-sm">
          <Utensils size={48} className="mb-2 transition-colors duration-300" />
          <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors duration-300">Vale-Alimentação</span>
        </Link>

        <Link href="/boletim" className="flex justify-center items-center flex-col aspect-video rounded-2xl border border-green-800/20 hover:border-green-900/50 transition-all duration-300 cursor-pointer hover:scale-105 hover:bg-transparent shadow-lg hover:shadow-xl backdrop-blur-sm">
          <File size={48} className="mb-2 transition-colors duration-300" />
          <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors duration-300">Boletim</span>
        </Link>
      </div>
    </div>
  )
}