import {useRef,useState} from 'react';
import {Alert,Button,Box} from '@mui/material';
import type {PageData,Row} from '../api/managementApi';
import {collectProducts as collectRows} from '../utils/productWorkbook';
import {useL} from './AdminCommon';

export function ListExcelExport({load,build,fileName,disabled=false}:{load:(page:number,size:number)=>Promise<PageData>;build:(rows:Row[])=>Promise<{xlsx:{writeBuffer:()=>Promise<any>}}>;fileName:string;disabled?:boolean}) {
 const l=useL(),lock=useRef(false);const [busy,setBusy]=useState(false),[error,setError]=useState(false);
 const run=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError(false);try{
  const rows=await collectRows(load),book=await build(rows),buffer=await book.xlsx.writeBuffer();
  const url=URL.createObjectURL(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const link=document.createElement('a');link.href=url;link.download=fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch{setError(true)}finally{lock.current=false;setBusy(false)}};
 return <Box sx={{mb:2}}><Button disabled={disabled||busy} onClick={()=>void run()}>{busy?l('Yuklanmoqda…','Загрузка…','Exporting…'):l('Excel — barcha natijalar','Excel — все результаты','Excel — all results')}</Button>{error&&<Alert severity="error" onClose={()=>setError(false)}>{l('Eksport bajarilmadi. Qayta urinib ko‘ring yoki filtr orqali 50 000 tagacha kamaytiring.','Экспорт не выполнен. Повторите или сократите выборку до 50 000 строк.','Export failed. Retry or narrow the filters to at most 50,000 rows.')}</Alert>}</Box>;
}
