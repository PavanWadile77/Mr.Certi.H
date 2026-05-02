import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";import{getAuth,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";import{getFirestore,collection,doc,setDoc,getDoc,getDocs,deleteDoc,query,where,orderBy,serverTimestamp,updateDoc}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";import{getStorage,ref,uploadBytes,getDownloadURL}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
const firebaseConfig={apiKey:"AIzaSyBuTV1Yeh77iWt8nJ8V09gUNUhagyhg4iY",authDomain:"mr-certi.firebaseapp.com",projectId:"mr-certi",storageBucket:"mr-certi.firebasestorage.app",messagingSenderId:"60676407665",appId:"1:60676407665:web:1113311464e6b6dc45b6d0",measurementId:"G-CRDZXN6TYD"};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
let currentUser=null,participants=[],templates=[];

function toast(msg,type='info'){let c=document.getElementById('toastContainer');if(!c){c=document.createElement('div');c.className='toast-container';c.id='toastContainer';document.body.appendChild(c);}const t=document.createElement('div');t.className=`toast toast-${type}`;t.textContent=msg;c.appendChild(t);setTimeout(()=>{t.classList.add('fadeout');setTimeout(()=>t.remove(),300)},3500)}

onAuthStateChanged(auth,async u=>{if(!u){window.location.href='index.html';return}
// Try Firestore with timeout, fallback to localStorage
let userData=null;
try{const d=await Promise.race([getDoc(doc(db,'users',u.uid)),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),5000))]);if(d.exists()){userData=d.data();if(userData.role!=='organizer'){window.location.href='index.html';return}}}catch(e){console.warn('Firestore unavailable, using localStorage:',e.message)}
if(!userData){const savedRole=localStorage.getItem('mr_certi_role');if(savedRole!=='organizer'){window.location.href='index.html';return}userData={name:localStorage.getItem('mr_certi_name')||'Organizer',email:u.email,role:'organizer'}}
currentUser={uid:u.uid,...userData};localStorage.setItem('mr_certi_role',userData.role);localStorage.setItem('mr_certi_name',userData.name||'');document.getElementById('userName').textContent=currentUser.name||'Organizer';document.getElementById('userAvatar').textContent=(currentUser.name||'O')[0].toUpperCase();document.getElementById('pageLoading').style.display='none';document.getElementById('dashboardWrapper').style.display='flex';try{await loadData()}catch(e){console.warn('loadData error:',e)}});

async function loadData(){await loadParticipants();await loadTemplates();updateStats()}
async function loadParticipants(){try{const snap=await getDocs(query(collection(db,'participants'),where('createdBy','==',currentUser.uid)));participants=[];snap.forEach(d=>participants.push({id:d.id,...d.data()}));renderParticipants();document.getElementById('participantCount').textContent=participants.length}catch(e){console.error(e);try{const snap=await getDocs(collection(db,'participants'));participants=[];snap.forEach(d=>participants.push({id:d.id,...d.data()}));renderParticipants();document.getElementById('participantCount').textContent=participants.length}catch(e2){console.error(e2)}}}
async function loadTemplates(){try{const snap=await getDocs(query(collection(db,'certificates'),where('createdBy','==',currentUser.uid)));templates=[];snap.forEach(d=>templates.push({id:d.id,...d.data()}));renderTemplates()}catch(e){console.error(e)}}

function updateStats(){const total=participants.length,gen=participants.filter(p=>p.status==='generated'||p.status==='sent').length,sent=participants.filter(p=>p.status==='sent').length;document.getElementById('statTotal').textContent=total;document.getElementById('statGenerated').textContent=gen;document.getElementById('statSent').textContent=sent;document.getElementById('statPending').textContent=total-gen;const pct=total?Math.round(gen/total*100):0;document.getElementById('genProgressFill').style.width=pct+'%';document.getElementById('genProgressText').textContent=`${gen} of ${total} generated`;renderRecent();renderSendStatus()}

function statusBadge(s){const m={pending:'badge-warning',generated:'badge-info',sent:'badge-success'};return`<span class="badge ${m[s]||'badge-gray'}">${s||'pending'}</span>`}
function renderRecent(){const tb=document.getElementById('recentParticipantsBody');if(!participants.length){tb.innerHTML='<tr><td colspan="4" class="table-empty"><span class="empty-icon">👤</span>No participants yet</td></tr>';return}
tb.innerHTML=participants.slice(0,5).map(p=>`<tr><td>${p.name}</td><td>${p.email}</td><td>${statusBadge(p.status)}</td><td><button class="btn-secondary" onclick="switchPanel('participants')">View</button></td></tr>`).join('')}

function renderParticipants(){const tb=document.getElementById('participantsTableBody');const search=(document.getElementById('searchParticipants')?.value||'').toLowerCase();const filter=document.getElementById('statusFilter')?.value||'';let list=participants;if(search)list=list.filter(p=>(p.name||'').toLowerCase().includes(search)||(p.email||'').toLowerCase().includes(search));if(filter)list=list.filter(p=>p.status===filter);
if(!list.length){tb.innerHTML='<tr><td colspan="6" class="table-empty"><span class="empty-icon">👥</span>No participants found</td></tr>';document.getElementById('participantPagination').textContent='Showing 0';return}
tb.innerHTML=list.map(p=>`<tr><td><input type="checkbox" class="p-check" data-id="${p.id}"/></td><td>${p.name}</td><td>${p.email}</td><td>${statusBadge(p.status)}</td><td>${p.certificateUrl?`<a href="${p.certificateUrl}" target="_blank" class="btn-secondary" style="font-size:.75rem;padding:4px 10px">View</a>`:'—'}</td><td><button class="btn-outline" style="padding:4px 10px;font-size:.75rem" onclick="editParticipant('${p.id}')">Edit</button> <button class="btn-danger" style="padding:4px 10px;font-size:.75rem" onclick="deleteParticipant('${p.id}')">Delete</button></td></tr>`).join('');
document.getElementById('participantPagination').textContent=`Showing ${list.length} of ${participants.length}`}

function renderTemplates(){const el=document.getElementById('templatesList');if(!templates.length){el.innerHTML='<div class="table-empty"><span class="empty-icon">🖼️</span>No templates uploaded yet</div>';document.getElementById('namePosCard').style.display='none';return}
document.getElementById('namePosCard').style.display='block';el.innerHTML=templates.map(t=>`<div class="cert-item"><div class="cert-thumb"><img src="${t.templateUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='<div class=cert-thumb-inner><div class=cert-thumb-badge>🖼️</div><div class=cert-thumb-name>Template</div></div>'"/></div><div class="cert-item-body"><div class="cert-item-name">Certificate Template</div><div class="cert-item-email">${new Date(t.createdAt?.seconds*1000||Date.now()).toLocaleDateString()}</div><div class="cert-item-actions"><button class="btn-danger" style="font-size:.75rem;padding:4px 10px" onclick="deleteTemplate('${t.id}')">Delete</button></div></div></div>`).join('')}

function renderSendStatus(){const tb=document.getElementById('sendStatusBody');if(!participants.length){tb.innerHTML='<tr><td colspan="5" class="table-empty"><span class="empty-icon">📨</span>No data</td></tr>';return}
tb.innerHTML=participants.map(p=>`<tr><td>${p.name}</td><td>${p.email}</td><td>${p.certificateUrl?'✓ Ready':'—'}</td><td>${statusBadge(p.status)}</td><td>${p.status==='generated'?`<button class="btn-primary" style="font-size:.75rem;padding:4px 12px" onclick="sendSingleEmail('${p.id}')">Send</button>`:p.status==='sent'?'<span class="badge badge-success">Sent ✓</span>':'—'}</td></tr>`).join('')}

// Panel navigation
window.switchPanel=function(panel){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.getElementById('panel-'+panel)?.classList.add('active');document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));document.querySelector(`[data-panel="${panel}"]`)?.classList.add('active');document.getElementById('topbarTitle').textContent={overview:'Overview',participants:'Participants',templates:'Templates',certificates:'Certificates',send:'Send Emails'}[panel]||panel}
document.querySelectorAll('.nav-item[data-panel]').forEach(n=>n.addEventListener('click',()=>switchPanel(n.dataset.panel)));

// Sidebar mobile
document.getElementById('menuBtn')?.addEventListener('click',()=>{document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebarOverlay').classList.toggle('show')});
document.getElementById('sidebarOverlay')?.addEventListener('click',()=>{document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('show')});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click',async()=>{await signOut(auth);window.location.href='index.html'});
document.getElementById('refreshBtn')?.addEventListener('click',()=>loadData());

// Add participant modal
function openParticipantModal(p=null){document.getElementById('participantModal').classList.add('active');document.getElementById('participantModalTitle').textContent=p?'Edit Participant':'Add Participant';document.getElementById('pName').value=p?.name||'';document.getElementById('pEmail').value=p?.email||'';document.getElementById('participantModalError').textContent='';document.getElementById('saveParticipantBtn').dataset.editId=p?.id||''}
function closeParticipantModal(){document.getElementById('participantModal').classList.remove('active')}
document.getElementById('addParticipantBtn')?.addEventListener('click',()=>openParticipantModal());
document.getElementById('addParticipantBtn2')?.addEventListener('click',()=>openParticipantModal());
document.getElementById('closeParticipantModal')?.addEventListener('click',closeParticipantModal);
document.getElementById('cancelParticipantBtn')?.addEventListener('click',closeParticipantModal);

document.getElementById('saveParticipantBtn')?.addEventListener('click',async()=>{const name=document.getElementById('pName').value.trim(),email=document.getElementById('pEmail').value.trim();if(!name||!email){document.getElementById('participantModalError').textContent='Please fill all fields';return}
const editId=document.getElementById('saveParticipantBtn').dataset.editId;try{if(editId){await updateDoc(doc(db,'participants',editId),{name,email});toast('Participant updated','success')}else{const id=crypto.randomUUID();await setDoc(doc(db,'participants',id),{id,name,email,certificateUrl:'',status:'pending',createdBy:currentUser.uid,createdAt:serverTimestamp()});toast('Participant added','success')}
closeParticipantModal();await loadData()}catch(e){document.getElementById('participantModalError').textContent='Error: '+e.message}});

window.editParticipant=function(id){const p=participants.find(x=>x.id===id);if(p)openParticipantModal(p)};
window.deleteParticipant=async function(id){if(!confirm('Delete this participant?'))return;try{await deleteDoc(doc(db,'participants',id));toast('Deleted','success');await loadData()}catch(e){toast('Error: '+e.message,'error')}};
window.deleteTemplate=async function(id){if(!confirm('Delete this template?'))return;try{await deleteDoc(doc(db,'certificates',id));toast('Deleted','success');await loadData()}catch(e){toast('Error: '+e.message,'error')}};

// Search & filter
document.getElementById('searchParticipants')?.addEventListener('input',renderParticipants);
document.getElementById('statusFilter')?.addEventListener('change',renderParticipants);
document.getElementById('selectAll')?.addEventListener('change',e=>{document.querySelectorAll('.p-check').forEach(c=>c.checked=e.target.checked)});

// CSV import
document.getElementById('importCsvBtn')?.addEventListener('click',()=>{document.getElementById('csvImportCard').style.display='block'});
document.getElementById('closeCsvImport')?.addEventListener('click',()=>{document.getElementById('csvImportCard').style.display='none'});
let csvData=[];
document.getElementById('csvFileInput')?.addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{const lines=ev.target.result.split('\n').filter(l=>l.trim());csvData=[];let start=0;const first=lines[0].toLowerCase();if(first.includes('name')&&first.includes('email'))start=1;for(let i=start;i<lines.length;i++){const parts=lines[i].split(',');if(parts.length>=2){csvData.push({name:parts[0].trim(),email:parts[1].trim()})}}
document.getElementById('csvCount').textContent=csvData.length;const tb=document.getElementById('csvPreviewBody');tb.innerHTML=csvData.slice(0,10).map(r=>`<tr><td>${r.name}</td><td>${r.email}</td></tr>`).join('');document.getElementById('csvPreview').style.display='block'};reader.readAsText(file)});
document.getElementById('cancelCsvImport')?.addEventListener('click',()=>{csvData=[];document.getElementById('csvPreview').style.display='none'});
document.getElementById('importCsvConfirm')?.addEventListener('click',async()=>{if(!csvData.length)return;try{for(const r of csvData){const id=crypto.randomUUID();await setDoc(doc(db,'participants',id),{id,name:r.name,email:r.email,certificateUrl:'',status:'pending',createdBy:currentUser.uid,createdAt:serverTimestamp()})}
toast(`${csvData.length} participants imported!`,'success');csvData=[];document.getElementById('csvPreview').style.display='none';document.getElementById('csvImportCard').style.display='none';await loadData()}catch(e){toast('Import error: '+e.message,'error')}});

// Template upload
const templateZone=document.getElementById('templateUploadZone');
templateZone?.addEventListener('dragover',e=>{e.preventDefault();templateZone.classList.add('drag-over')});
templateZone?.addEventListener('dragleave',()=>templateZone.classList.remove('drag-over'));
templateZone?.addEventListener('drop',e=>{e.preventDefault();templateZone.classList.remove('drag-over');if(e.dataTransfer.files[0])uploadTemplate(e.dataTransfer.files[0])});
document.getElementById('templateFileInput')?.addEventListener('change',e=>{if(e.target.files[0])uploadTemplate(e.target.files[0])});

async function uploadTemplate(file){if(file.size>10*1024*1024){toast('File too large (max 10MB)','error');return}
document.getElementById('templateUploadProgress').style.display='block';document.getElementById('templateProgressFill').style.width='30%';
try{const sRef=ref(storage,`templates/${currentUser.uid}/${Date.now()}_${file.name}`);await uploadBytes(sRef,file);document.getElementById('templateProgressFill').style.width='70%';const url=await getDownloadURL(sRef);const id=crypto.randomUUID();await setDoc(doc(db,'certificates',id),{id,templateUrl:url,createdBy:currentUser.uid,createdAt:serverTimestamp()});document.getElementById('templateProgressFill').style.width='100%';toast('Template uploaded!','success');await loadData()}catch(e){toast('Upload failed: '+e.message,'error')}
setTimeout(()=>{document.getElementById('templateUploadProgress').style.display='none';document.getElementById('templateProgressFill').style.width='0%'},1500)}

// Generate certificates (creates canvas-based cert images)
document.getElementById('generateAllBtn')?.addEventListener('click',generateAllCerts);
document.getElementById('bulkGenerate')?.addEventListener('click',()=>{const ids=[...document.querySelectorAll('.p-check:checked')].map(c=>c.dataset.id);if(!ids.length){toast('Select participants first','warning');return}generateCerts(participants.filter(p=>ids.includes(p.id)))});

async function generateAllCerts(){const pending=participants.filter(p=>p.status==='pending');if(!pending.length){toast('No pending participants','warning');return}await generateCerts(pending)}

async function generateCerts(list){if(!templates.length){toast('Upload a template first!','warning');switchPanel('templates');return}
const template=templates[0];toast(`Generating ${list.length} certificates...`,'info');
const nameX=parseInt(document.getElementById('nameX')?.value||50);const nameY=parseInt(document.getElementById('nameY')?.value||50);const fontSize=parseInt(document.getElementById('nameFontSize')?.value||48);const fontColor=document.getElementById('nameColor')?.value||'#1e293b';

for(let i=0;i<list.length;i++){const p=list[i];try{const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');const img=new Image();img.crossOrigin='anonymous';await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>{canvas.width=1200;canvas.height=850;const g=ctx.createLinearGradient(0,0,1200,850);g.addColorStop(0,'#e0f2fe');g.addColorStop(1,'#f0f9ff');ctx.fillStyle=g;ctx.fillRect(0,0,1200,850);ctx.strokeStyle='#0ea5e9';ctx.lineWidth=8;ctx.strokeRect(30,30,1140,790);ctx.strokeStyle='#bae6fd';ctx.lineWidth=2;ctx.strokeRect(50,50,1100,750);ctx.fillStyle='#0ea5e9';ctx.font='bold 18px Inter,sans-serif';ctx.textAlign='center';ctx.fillText('CERTIFICATE OF ACHIEVEMENT',600,150);ctx.fillStyle='#334155';ctx.font='300 16px Inter,sans-serif';ctx.fillText('This is to certify that',600,280);ctx.fillStyle=fontColor;ctx.font=`bold ${fontSize}px Inter,sans-serif`;ctx.fillText(p.name,600,350);ctx.fillStyle='#334155';ctx.font='300 16px Inter,sans-serif';ctx.fillText('has successfully completed the requirements',600,420);ctx.fillStyle='#64748b';ctx.font='14px Inter,sans-serif';ctx.fillText('Issued by Mr.Certi',600,550);ctx.fillText(new Date().toLocaleDateString(),600,580);resolve()};img.src=template.templateUrl});
if(img.complete&&img.naturalWidth){canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;ctx.drawImage(img,0,0);ctx.fillStyle=fontColor;ctx.font=`bold ${fontSize}px Inter,sans-serif`;ctx.textAlign='center';ctx.fillText(p.name,canvas.width*nameX/100,canvas.height*nameY/100)}
const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));const sRef=ref(storage,`certs/${currentUser.uid}/${p.id}.png`);await uploadBytes(sRef,blob);const url=await getDownloadURL(sRef);await updateDoc(doc(db,'participants',p.id),{certificateUrl:url,status:'generated'});
const pct=Math.round((i+1)/list.length*100);document.getElementById('genProgressFill').style.width=pct+'%';document.getElementById('genProgressText').textContent=`${i+1} of ${list.length} generated`}catch(e){console.error('Gen error for',p.name,e)}}
toast('Certificates generated!','success');await loadData();renderCertGrid()}

function renderCertGrid(){const el=document.getElementById('certificatesGrid');const search=(document.getElementById('searchCerts')?.value||'').toLowerCase();let list=participants.filter(p=>p.certificateUrl);if(search)list=list.filter(p=>(p.name||'').toLowerCase().includes(search)||(p.email||'').toLowerCase().includes(search));
if(!list.length){el.innerHTML='<div class="table-empty"><span class="empty-icon">🏆</span>No certificates generated yet</div>';return}
el.innerHTML=list.map(p=>`<div class="cert-item"><div class="cert-thumb"><img src="${p.certificateUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='<div class=cert-thumb-inner><div class=cert-thumb-badge>🏆</div><div class=cert-thumb-name>${p.name}</div></div>'"/></div><div class="cert-item-body"><div class="cert-item-name">${p.name}</div><div class="cert-item-email">${p.email}</div><div class="cert-item-actions"><a href="${p.certificateUrl}" download class="btn-secondary" style="font-size:.75rem;padding:4px 10px;text-decoration:none">⬇ Download</a></div></div></div>`).join('')}
document.getElementById('searchCerts')?.addEventListener('input',renderCertGrid);

document.getElementById('downloadAllBtn')?.addEventListener('click',()=>{participants.filter(p=>p.certificateUrl).forEach(p=>{const a=document.createElement('a');a.href=p.certificateUrl;a.download=`${p.name}_certificate.png`;a.target='_blank';document.body.appendChild(a);a.click();a.remove()})});

// Send emails (simulated - stores status in Firestore)
document.getElementById('sendAllBtn')?.addEventListener('click',async()=>{const list=participants.filter(p=>p.status==='generated');if(!list.length){toast('No generated certificates to send','warning');return}
toast(`Sending to ${list.length} participants...`,'info');for(const p of list){try{await updateDoc(doc(db,'participants',p.id),{status:'sent'});} catch(e){console.error(e)}}
toast('All emails marked as sent!','success');await loadData()});

window.sendSingleEmail=async function(id){try{await updateDoc(doc(db,'participants',id),{status:'sent'});toast('Marked as sent!','success');await loadData()}catch(e){toast('Error: '+e.message,'error')}};

document.getElementById('saveNamePos')?.addEventListener('click',()=>toast('Name position saved!','success'));
