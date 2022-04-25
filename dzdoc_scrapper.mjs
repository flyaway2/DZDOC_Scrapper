/* given that the website didn't mention how many doctors are available, I had to test the maximum ID available
for now I'm gonna assume it's 10 000 doctors, I'm gonna create two script :
First one: scrape doctors by incrementing ID from 0 to 10 000 then save them in csv file, url: https://dzdoc.com/profil.php?id
Second one: scrape specialties,states and counties (just for information gothering purpose), https://dzdoc.com/
after that use specialties and states to go through all the states and specialties one by one, https://dzdoc.com/recherche.php?specialite=80&region=1
get the link to each doctor https://dzdoc.com/profil.php?id
save doctor information in sqlite database 
Doctor info:
Name: class="doctor-name"
Specialty: h4 class="no-margin"
Address: id="adresse"
Map: id="map" data-latitude, data-longitude

Gender: class="profil-img" img src containes male or female word or unknown
Specialty: class="col-md-12 pad-t-5" > class="unstyled"


*/
import  Cheerio  from "cheerio";
import node_fetch from "node-fetch";
import file  from "fs";
import { json } from "stream/consumers";
const GetParsedUrl=async(url)=>{
    var response;
    response=await node_fetch(url);
 while(response ==null)
 {
    response=await node_fetch(url);
 }
    const body=await response.text();
    const ParsedBody=Cheerio.load(body);
    return ParsedBody;
 
}

const dzdoc_scrapper=(async()=>{
    const url="https://dzdoc.com/profil.php?id="
    const DoctorList=[];
    for(var i=0;i<10000;i++)
    {
        const ParsedDocP= await  GetParsedUrl(url+i);
        
         const DoctorInfo = {name:"",address:"",sexe:"",spec: "",horaire:"",formation:"",Tel1:"",Fax:"",Tel2:""};
      
          DoctorInfo.name= ParsedDocP(".doctor-name").text().trim();
          DoctorInfo.address= ParsedDocP("#adresse").text().trim();
          ParsedDocP(".profil-img img").each(async(i,elem)=>{
             var gender= ParsedDocP(elem).attr("src");
              if(gender.toLowerCase().includes("female"))
             {
              DoctorInfo.sexe="female";
             }
             else if(gender.toLowerCase().includes("male"))
             {
                 DoctorInfo.sexe="male";
      
             }
      
          });
          ParsedDocP(".col-md-7 .row  .col-md-12").each(async(i,elem)=>{
             if(ParsedDocP(elem).children("h4").text().includes("Specialité"))
             {
          
              DoctorInfo.spec= ParsedDocP(elem).children("ul").text().trim();
      
      
             }else if(ParsedDocP(elem).children("h4").text().includes("Horaires d'ouverture"))
             {
                 
         
              DoctorInfo.horaire=ParsedDocP(elem).children("p").text().trim();
             }else if(ParsedDocP(elem).children("h4").text().includes("Formation"))
             {
             
              DoctorInfo.formation=ParsedDocP(elem).children("ul").text().trim();
             }
           
      
         });
         ParsedDocP(".col-md-5 .row  .col-md-12").each(async(i,elem)=>{
           if(ParsedDocP(elem).children("h4").text().toLowerCase().includes("téléphone"))
          {
              var telnum=ParsedDocP(elem).children("ul").text().trim().split("\n");
              DoctorInfo.Tel1=telnum[0].trim();
              if(telnum.length>1)
              {
                  
                  DoctorInfo.Tel2=telnum[1].trim();
              }
      
             
          }else if(ParsedDocP(elem).children("h4").text().toLowerCase().includes("fax"))
          {
              DoctorInfo.Fax=ParsedDocP(elem).children("p").text().trim();
           
          }
         });
         
         if(DoctorInfo.name!=='')
         {
            console.log("doctor name:"+DoctorInfo.name+" doctor number:"+i);
          DoctorList.push(DoctorInfo);
         }else
         {
            console.log("empty page number:"+i);
         }
      
    }

   const doctorfile=JSON.stringify(DoctorList,null,'\r\n');
   file.writeFile("doctorlist.json",doctorfile,function(err){

    if(err)
    {
        console.log(err)
    }
   })
   //console.table("doctorlist:"+DoctorList.map(doc=>doc.name));

})
dzdoc_scrapper();