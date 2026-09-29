document.querySelectorAll('a[href="#"]').forEach(link=>{link.addEventListener('click',e=>e.preventDefault())});
console.log("Connect is ready.");
