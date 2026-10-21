import {useCallback,useEffect,useState} from 'react';
import {Alert,Chip,Switch,Table,TableBody,TableCell,TableHead,TableRow,Typography} from '@mui/material';
import {useL,LoadState,TablePanel,dateTime} from './AdminCommon';
import {apiRequest} from '../api/client';
import {useAuth} from '../auth/AuthProvider';
import type {Row} from '../api/managementApi';

// M14 (TZ v10 §10): strictness rules Q-1…Q-18; switchable ones are on/off separately for staff and the owner.
const base='/ninimum/api/v1/admin/management/rules';
type L=ReturnType<typeof useL>;
const describe=(l:L,code:string)=>({
 'Q-1':l('Tasdiqlangan hujjatni tahrirlash / o‘chirish taqiqlangan — faqat storno','Нельзя менять или удалять проведённый документ — только сторно','Approved documents can’t be edited or deleted — reversal only'),
 'Q-2':l('Ko‘r qabul va ko‘r sanash','Слепая приёмка и слепой пересчёт','Blind receiving and blind counting'),
 'Q-3':l('Kirimda "yaroqli" bo‘lmagan tovarga rasm majburiy','Фото обязательно для негодного товара при приёмке','Photo required for unfit goods at receiving'),
 'Q-4':l('Kirim narxi oldingisidan farq qilsa izoh','Комментарий, если цена прихода отличается от прошлой','Note when the purchase price differs from the last one'),
 'Q-5':l('Spisaniyada rasm majburiy','Фото обязательно при списании','Photo required for a write-off'),
 'Q-6':l('Spisaniyani boshqa odam tasdiqlaydi','Списание проводит другой человек','A write-off is approved by someone else'),
 'Q-7':l('Oylik spisaniya limiti oshsa ogohlantirish','Предупреждение при превышении лимита списаний за месяц','Warning when monthly write-offs exceed the limit'),
 'Q-8':l('Sanashda farq bor qatorga izoh','Комментарий к расхождению при пересчёте','Reason for a count difference'),
 'Q-9':l('Buyurtmani bekor qilishda sabab','Причина при отмене заказа','Reason when cancelling an order'),
 'Q-10':l('Narx o‘zgartirishda sabab','Причина при изменении цены','Reason when changing a price'),
 'Q-11':l('Muddati o‘tgan tovar sotilmaydi; muddat ogohlantirishi','Просроченный товар не продаётся; предупреждение о сроке','Expired goods aren’t sold; expiry warning'),
 'Q-12':l('Buyurtma holatini orqaga qaytarish taqiqlangan','Нельзя вернуть заказ на прошлый статус','An order status can’t go backwards'),
 'Q-13':l('Ommaviy holat o‘zgartirish taqiqlangan','Массовая смена статуса запрещена','No bulk status changes'),
 'Q-14':l('Ombor ilovasida skaner majburiy (kodni qo‘lda kiritish yo‘q)','Сканер обязателен в складском приложении (без ручного ввода)','Scanner required in the warehouse app (no manual code entry)'),
 'Q-15':l('Taymerlar','Таймеры','Timers'),
 'Q-16':l('Yopilgan davrga hujjat kiritish taqiqlangan','Нельзя вносить документы в закрытый период','No documents in a closed period'),
 'Q-17':l('Tovarni o‘chirish taqiqlangan — faqat nofaol','Товар нельзя удалить — только сделать неактивным','Products can’t be deleted — only deactivated'),
 'Q-18':l('Xarajatga chek rasmi majburiy','Фото чека обязательно для расхода','Receipt photo required for an expense'),
} as Record<string,string>)[code]||code;

export function StrictRulesSettings(){
 const l=useL(),{accessToken}=useAuth();
 const [rows,setRows]=useState<Row[]|null>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState<string|null>(null);
 const load=useCallback(async()=>{try{setRows((await apiRequest<Row[]>(base,{token:accessToken!})).resultData);setError(null);}catch{setError(l('Qoidalarni yuklab bo‘lmadi.','Не удалось загрузить правила.','Could not load the rules.'));}// eslint-disable-next-line react-hooks/exhaustive-deps -- reload on sign-in only
 },[accessToken]);
 useEffect(()=>{void load()},[load]);
 const save=async(r:Row,key:'staff_enabled'|'owner_enabled',value:boolean)=>{setBusy(r.code);try{setRows((await apiRequest<Row[]>(`${base}/${r.code}`,{token:accessToken!,method:'PUT',body:JSON.stringify({staff_enabled:r.staff_enabled,owner_enabled:r.owner_enabled,[key]:value})})).resultData);setError(null);}catch{setError(l('Saqlab bo‘lmadi.','Не удалось сохранить.','Could not save.'));}finally{setBusy(null);}};
 const status=(r:Row)=>r.kind==='ALWAYS'?<Chip size="small" color="success" label={l('Doim yoqilgan','Всегда включено','Always on')}/>
  :r.kind==='LINKED'?<Chip size="small" label={r.code==='Q-15'?l('Sozlamalar → Taymerlar','Настройки → Таймеры','Settings → Timers'):l('Partiya va manzil qoldiqlari → Muddat','Партии и остатки → Сроки','Batches and bin stock → Expiry')}/>
  :r.kind==='MISSING'?<Chip size="small" variant="outlined" label={l('Bo‘lim hali yo‘q','Раздела пока нет','Module not built yet')}/>:null;
 return <LoadState loading={rows===null&&!error} error={rows===null?error:null} onRetry={()=>void load()}>
  {error&&rows&&<Alert severity="error" sx={{mb:2}} onClose={()=>setError(null)}>{error}</Alert>}
  <Alert severity="info" sx={{mb:2}}>{l('Har bir qoida xodimlar va Egasi uchun alohida yoqiladi. O‘zgarishlar darhol kuchga kiradi va kim o‘zgartirgani yoziladi.','Каждое правило включается отдельно для сотрудников и владельца. Изменения действуют сразу и записываются.','Each rule is switched separately for staff and the owner. Changes apply at once and are logged.')}</Alert>
  <TablePanel><Table size="small"><TableHead><TableRow><TableCell>№</TableCell><TableCell>{l('Qoida','Правило','Rule')}</TableCell><TableCell align="center">{l('Xodim','Сотрудник','Staff')}</TableCell><TableCell align="center">{l('Egasi','Владелец','Owner')}</TableCell><TableCell>{l('Holat','Статус','Status')}</TableCell></TableRow></TableHead>
  <TableBody>{rows?.map(r=><TableRow key={r.code}><TableCell>{r.code}</TableCell><TableCell>{describe(l,r.code)}{r.value&&<Typography variant="caption" sx={{display:'block',color:'text.secondary'}}>{r.value}</Typography>}{r.updated_by&&<Typography variant="caption" sx={{display:'block',color:'text.secondary'}}>{r.updated_by} · {dateTime(r.updated_at)}</Typography>}</TableCell>
   {r.kind==='SWITCH'?<><TableCell align="center"><Switch checked={Boolean(r.staff_enabled)} disabled={busy!==null} onChange={e=>void save(r,'staff_enabled',e.target.checked)}/></TableCell><TableCell align="center"><Switch checked={Boolean(r.owner_enabled)} disabled={busy!==null} onChange={e=>void save(r,'owner_enabled',e.target.checked)}/></TableCell><TableCell/></>
   :<><TableCell/><TableCell/><TableCell>{status(r)}</TableCell></>}
  </TableRow>)}</TableBody></Table></TablePanel>
 </LoadState>;
}
