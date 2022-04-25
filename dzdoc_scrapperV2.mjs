import cheerio from "cheerio"
import node_fetch from "node-fetch"
import file, { cp } from "fs"
import puppet from "puppeteer"
import sqlite from "sqlite3"
import { TIMEOUT } from "dns"


const LaunchBrowser=async()=>{
    const browser=await puppet.launch()
    return browser;
}
 const OpenPage=async (url,browser)=>
{
    console.log("browsing url "+url+" ...")
    const page=await browser.newPage()
    try{
     
        page.setDefaultNavigationTimeout(0)
        page.setDefaultTimeout(0)
        await page.goto(url,{
            waitUntil:'networkidle2',
        })
        console.log("entered the page")
    }catch(ex)
    {
        console.log("there's an error");
       await delay(10000)
      await  OpenPage(url,browser);
    }
    
    return page;
};
const SaveSpecDB=async(list,db)=>{
    for(const el of list)
    {
       await db.run("Insert or ignore into specialty (id,label) values(?,?)",[el.id,el.name])
    }
   
    console.log("saved speicalties")
   
}
const SaveWilayaDB=async(list,db)=>{
    for(const el of list)
    {
       await db.run("Insert or ignore into wilaya (id,name) values(?,?)",[el.id,el.name])
    }
   
    console.log("saved Wilayas")
   
}
const SaveCommuneDB=async(list,db)=>{
    for(const el of list)
    {
       await db.run("Insert or ignore into commune (name,state) values(?,?)",[el.name,el.wilaya])
    }
   
    console.log("saved Communes")
   
}
const SaveDocDB=async(DoctorInfo,map,db)=>{
   
    if(map.lat!=="")
    {
        await db.get("select from map where latitude=? and longitude=?",[map.lat,map.long],async function(err,row){
            if(row==null)
            {
                await db.run("insert  into map (latitude,longitude) values(?,?)",[map.lat,map.long],async function(err)
                {
                    
                    await db.run("Insert or ignore into doctor (id,name,spec,wilaya,address,gender,horaire,tel1,tel2,fax,formation,img,social,map) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
                    ,[DoctorInfo.id,DoctorInfo.name,DoctorInfo.spec,DoctorInfo.wilaya,DoctorInfo.address,
                    DoctorInfo.sexe,DoctorInfo.horaire,DoctorInfo.Tel1,DoctorInfo.Tel2
                    ,DoctorInfo.Fax,DoctorInfo.formation,DoctorInfo.img,DoctorInfo.social,this.lastID])
                });
            }
        })
      
       
    }else
    {
        await db.run("Insert or ignore into doctor (id,name,spec,wilaya,address,gender,horaire,tel1,tel2,fax,formation,img,social) values(?,?,?,?,?,?,?,?,?,?,?,?,?)"
        ,[DoctorInfo.id,DoctorInfo.name,DoctorInfo.spec,DoctorInfo.wilaya,DoctorInfo.address,
        DoctorInfo.sexe,DoctorInfo.horaire,DoctorInfo.Tel1,DoctorInfo.Tel2
        ,DoctorInfo.Fax,DoctorInfo.formation,DoctorInfo.img,DoctorInfo.social])
    }
     
    
   
    console.log("saved Doc")
   
}

const GetCommune=async (page,db,wilayalist)=>
{
   
    const test=  await page.$$(".selectize-input");
    console.log("testing:"+test);
    const WilayaBtn=  await test[1];
    const CommuneBtn= await  test[2];
   
    

    console.log("getting Communes:")
   
    var CommuneList=[]
    for(const wilaya of wilayalist)
    {
        const wilayaID=wilaya.id;
        console.log("wilaya:"+wilayaID)
       
        await WilayaBtn.click(".selectize-input")
        delay(3000)
        var wilayas=await page.$$(".selectize-dropdown-content")
        wilayas=await wilayas[1].$$(".option")
        const wilayaIndex= wilayaID -1
        await wilayas[wilayaIndex].click(".option")
        delay(3000)
     
        await CommuneBtn.click(".selectize-input")
        delay(3000)
        var Communes=await page.$$(".selectize-dropdown-content")
        var communeNames=await Communes[2].$$(".option")
        
         CommuneList=[]

        for(const communeName of communeNames)
        {
            const name= await communeName.evaluate(commune=>commune.textContent)
            const id= await communeName.evaluate(commune=>commune.getAttribute("data-value"))
            const CommuneObj={name:name,id:id,wilaya:wilayaID}
            
            CommuneList.push(CommuneObj)
        }
        console.log("Nbr of communes:"+CommuneList.length)
        await SaveCommuneDB(CommuneList,db)
        
    }
   
   return CommuneList;

}
const GetWilayas=async page=>
{
    console.log("getting wilayas:")
    var wilayas=await page.$$(".selectize-dropdown-content")
     wilayas=await wilayas[1].$$(".option")
    var wilayaList=[]
    for(const wilaya of wilayas)
    {
        const name= await wilaya.evaluate(ev=>ev.textContent)
        const id= await wilaya.evaluate(ev=>ev.getAttribute("data-value"))
        const wilayaObj={name:name,id:id}
         
        wilayaList.push(wilayaObj)
    }
    console.log("got the list of wilayas :"+wilayaList.length)
   return wilayaList;

}
const GetSpecialty=async page=>
{
    console.log("getting sepcialties:")
    const specs=await page.$$(".selectize-dropdown-content .option")
    var specList=[]
    for(const spec of specs)
    {
        const name= await spec.evaluate(ev=>ev.textContent)
        const id= await spec.evaluate(ev=>ev.getAttribute("data-value"))
        const SpecObj={name:name,id:id}
         
         specList.push(SpecObj)
    }
    console.log("got the list of specialties :"+specList.length)
   return specList;

}
const GetDoctorsList=async (page,spec,wilaya)=>{
    console.log("getting doctors list ..");
    const DocContainer=await page.$$(".list-group .list-group-item");
    const DocList=[]
    if(DocContainer.length>0)
    {
        console.log("There's docs on the page:"+DocContainer.length);
        var  NextBtn=await page.$(".next");
        while(NextBtn!=null)
        {
           
            const DocUrls=await page.$$(".list-group .list-group-item .profil-btn");
            for(const doc of DocUrls)
            {
                const SubUrl=await doc.evaluate(ev=>ev.getAttribute("href"))
                const docObj={url:SubUrl,spec:spec,wilaya:wilaya}
                DocList.push(docObj);
            }
            
           const IsNextPage= await NextBtn.evaluate(ev=>ev.getAttribute("class"))
           if(IsNextPage.includes("disabled"))
           {
            NextBtn=null;
           }else
           {
            console.log("There's Next button");
            await NextBtn.click("a")
            await page.waitForSelector(".hidden");
            NextBtn=await page.$(".next");
           }
        }

    }
    console.log("got the list of doctors")
    return DocList;
}
const GetDoctorInfo=async (page,DocID,specialtyID,WilayaID,db)=>
{
    console.log("getting doctor info ..");
    const DoctorInfo = {id:"",name:"",address:"",sexe:"",spec: "",horaire:"",formation:"",Tel1:"",Fax:"",Tel2:"",img:"",social:""};
    const map={long:"",lat:""}
    DoctorInfo.id=DocID;
    DoctorInfo.name=await page.evaluate(()=>document.querySelector(".doctor-name").textContent==undefined?"" : document.querySelector(".doctor-name").textContent.trim());
    DoctorInfo.address=await page.evaluate(()=>document.getElementById("adresse").textContent==undefined ? "":document.getElementById("adresse").textContent.trim());
    
    const gender=await page.evaluate(()=>document.querySelector(".profil-img img").getAttribute("src"));
    if(gender.toLowerCase().includes("female"))
    {
        DoctorInfo.sexe="female";
    }else if(gender.toLowerCase().includes("male"))
    {
        DoctorInfo.sexe="male";
    }else
    {
        DoctorInfo.img=gender;
    }
    var mapAttr=await page.$("#map")
    if(mapAttr!=null)
    {
        console.log("there's a map")
        map.lat=await mapAttr.evaluate(ev=>ev.getAttribute("data-latitude"))
        map.long=await mapAttr.evaluate(ev=>ev.getAttribute("data-longitude"))
   
    }
    const ColumnOne=await page.$$(".col-md-7 .row  .col-md-12");
    DoctorInfo.spec=specialtyID;
    DoctorInfo.wilaya=WilayaID;
    for(const Item of ColumnOne)
    {
      var title=await  Item.$("h4");
      if(title!=null)
      {
        title= await title.evaluate(ev=>ev.textContent);
      if(title.toLowerCase().includes("horaires d'ouverture"))
        {
            
            DoctorInfo.horaire=await Item.evaluate(ev=>ev.querySelector("p").textContent.trim());
            console.log("horaire:"+DoctorInfo.horaire)
        }else if(title.toLowerCase().includes("formation"))
        {
            DoctorInfo.formation=await Item.evaluate(ev=>ev.querySelector("ul").textContent.trim());
        }
      }
    }
    const ColumnTwo=await page.$$(".col-md-5 .row  .col-md-12");
    for(const item of ColumnTwo)
    {
        var title=await  item.$("h4");
        if(title!=null)
        {
            title= await title.evaluate(ev=>ev.textContent);
            if(title.toLowerCase().includes("téléphone"))
            {
               const TelList=await item.$$("ul li");
               DoctorInfo.Tel1=await TelList[0].evaluate(ev=>ev.textContent.trim());
               console.log("tel1:"+DoctorInfo.Tel1);
              if(TelList.length>1)
              {
                DoctorInfo.Tel2=await TelList[1].evaluate(ev=>ev.textContent.trim());
                  console.log("tel2:"+DoctorInfo.Tel2);
              }
            }else if(title.toLowerCase().includes("fax"))
            {
                DoctorInfo.Fax=await item.evaluate(ev=>ev.querySelector("p").textContent.trim());
                console.log("fax:"+DoctorInfo.Fax)
            }else if(title.toLowerCase().includes("sociaux"))
            {
                DoctorInfo.social=await item.evaluate(ev=>ev.querySelector("ul").textContent.trim());
                console.log("social network:"+DoctorInfo.social)
            }
        }
    }
    await SaveDocDB(DoctorInfo,map,db)



}

function delay(time) {
    return new Promise(function(resolve) { 
       setTimeout(resolve, time)
    });
  }
  (async()=>{
      
    console.time("duration")
    // part one getting the specialties and saving them in database
    var db= new sqlite.Database("./DZdocs.db")
    const MainUrl="https://dzdoc.com/"
    const DoctorListUrl="https://dzdoc.com/recherche.php?"
   
    const browser=await LaunchBrowser();
 
    const page= await OpenPage(MainUrl,browser);
    // clicking on specialty and wilaya to display the full list
    await page.waitForSelector(".hidden")
    console.log("page is loaded")
    const btns= await page.$$(".selectize-input")
    await btns[0].click(".selectize-input")
    await page.waitForSelector(".selectize-dropdown-content .option")
    console.log("specialty dropdown is visible")
    const SpecList=await GetSpecialty(page);
    await SaveSpecDB(SpecList,db);
    
    // part two getting wilayas and saving them in database
    await page.click(".h-service-content")
    await page.waitForSelector(".selectize-dropdown-content .option",{hidden:true})
    console.log("unselect specialty btn")
    await btns[1].click(".selectize-input")
    await page.waitForSelector(".selectize-dropdown-content .option")
    const wilayalist=await GetWilayas(page)
   
    await SaveWilayaDB(wilayalist,db)

    await page.close();
    // part three getting the communes
  /*
 const SpecificDocListPage=DoctorListUrl+"specialite="+98+"&region=1"
 const ListOfDocsPage= await OpenPage(SpecificDocListPage,browser);
 await ListOfDocsPage.screenshot({path:"doctlist.png"})
     await GetCommune(ListOfDocsPage,db,wilayalist)
    */



    // part four getting doctors and save them in database

    //.list-group .list-group-item
    //.previous .next

                
    for(const specialty of SpecList)
    {
        console.log("specialty:"+specialty.name)
        for(const wilaya of wilayalist)
        {
            console.log("wilaya:"+wilaya.name)
            const ConstructedUrl=DoctorListUrl+"specialite="+specialty.id+"&region="+wilaya.id
            const DocsPage=await OpenPage(ConstructedUrl,browser);
            await DocsPage.waitForSelector(".hidden")
            const DocList=await GetDoctorsList(DocsPage,specialty,wilaya)
            for(const doc of DocList)
            {
                console.log("doc:"+MainUrl+doc.url);
                const DocID=await doc.url.split("=").pop()
                const FullDocUrl=MainUrl+doc.url
                const DocInfoPage=await OpenPage(FullDocUrl,browser)
                await DocInfoPage.waitForSelector(".hidden")
                await GetDoctorInfo(DocInfoPage,DocID,specialty.id,wilaya.id,db)
                await DocInfoPage.close();

            }
           await DocsPage.close()
        }
    }

    console.log("done executing")
    await browser.close()
    console.timeEnd("duration")
})()