
export default function VersionPage() {
    return (
        <div className="flex items-center justify-center h-screen bg-black text-white text-2xl font-bold p-10">
            <div className="border border-white p-10 rounded">
                <h1>STATUS: ONLINE</h1>
                <p className="mt-4 text-green-500">Versão: V4.1 (Corrigida)</p>
                <p className="text-sm text-gray-400 mt-2">Build Time: {new Date().toISOString()} (Trigger Deploy)</p>
            </div>
        </div>
    );
}
