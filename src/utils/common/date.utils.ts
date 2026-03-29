export const isExpired=(date:Date)=>{
    return new Date()>date;
}

export const addMinutes=(minutes:number)=>{
    return new Date(Date.now() +minutes*60000)
}