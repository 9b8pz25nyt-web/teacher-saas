"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";


export default function BooksPage(){

  const [books,setBooks] = useState<any[]>([]);
  const [title,setTitle] = useState("");


  async function loadBooks(){

    const {data,error}=await supabase
      .from("books")
      .select("*")
      .order("title");


    if(!error){
      setBooks(data || []);
    }

  }



  async function addBook(){

    if(!title) return;


    const {error}=await supabase
      .from("books")
      .insert({
        title:title
      });


    if(error){
      alert(error.message);
      return;
    }


    setTitle("");
    loadBooks();

  }



  async function deleteBook(id:string){

    const {error}=await supabase
      .from("books")
      .delete()
      .eq("id",id);


    if(error){
      alert(error.message);
      return;
    }


    loadBooks();

  }



  useEffect(()=>{

    loadBooks();

  },[]);



return (

<main className="p-8">


<h1 className="
text-3xl
font-bold
text-[#6b0f3b]
mb-6
">
📚 Books
</h1>



<div className="
bg-white
border
border-pink-200
rounded-2xl
p-6
mb-6
">


<h2 className="
font-semibold
text-lg
mb-3
">
Add Book
</h2>


<div className="
flex
gap-3
">


<input

value={title}

onChange={(e)=>setTitle(e.target.value)}

placeholder="Book name"

className="
border
border-pink-200
rounded-xl
px-4
py-2
flex-1
"

/>


<button

onClick={addBook}

className="
bg-pink-600
text-white
px-5
rounded-xl
"

>
Add
</button>


</div>


</div>




<div className="
bg-white
border
border-pink-200
rounded-2xl
p-6
">


<h2 className="
font-semibold
text-lg
mb-4
">
Book List
</h2>



{
books.map((book)=>(

<div

key={book.id}

className="
flex
justify-between
items-center
bg-pink-50
border
border-pink-200
rounded-xl
p-3
mb-2
"

>


<p>
{book.title}
</p>



<button

onClick={()=>deleteBook(book.id)}

className="
text-red-500
"

>
🗑
</button>


</div>


))
}



</div>



</main>

);


}