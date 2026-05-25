"use client"

import { useState } from "react";

export default function Dashboard() {

    const [image, setImage] = useState<File | null>(null);

    const [session, setSession] = useState(false);

    return (
        <main className="min-h-screen bg-black">
            <header className="text-white p-4">
                <h1 className="text-2xl font-bold">Radidone</h1>
            </header>
            <section className="p-4  w-full grid grid-cols-12 gap-4 h-[calc(100vh-4rem)]">
                <div className="col-span-8 bg-zinc-900 rounded-xl h-full">
                    {image ? (
                        <img src={URL.createObjectURL(image)} alt="Uploaded" className="w-full object-cover p-4" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <label htmlFor="file-upload" className="cursor-pointer bg-zinc-800 text-white px-4 py-2 rounded-md">Upload Image</label>
                            <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    setImage(e.target.files[0]);
                                }
                            }} />
                        </div>
                    )}
                </div>
                <div className="col-span-4 bg-zinc-900 rounded-xl h-full">
                    {/* chatbot */}
                    {session && image ? (
                        <div className="p-4 flex flex-col h-full justify-between">
                            <div className="flex flex-col gap-4">
                                <div>
                                    <p className="p-2 rounded-lg bg-white text-black inline-block">hi, i m radidone how i can assist you</p>
                                </div>
                                <div className="self-end">
                                    <p className="p-2 rounded-lg bg-black text-white inline-block items-end">walk me through the important findings</p>
                                </div>
                            </div>
                            {/* speak button for audio input */}
                            <div className="w-full flex justify-center">
                                {/* record audio input */}
                                <button className="bg-blue-500 text-white px-4 py-2 rounded-md">
                                    Speak 
                                </button>

                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <button className="bg-blue-500 text-white px-4 py-2 rounded-md" onClick={() => setSession(true)}>
                                Start Session
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
