
//generate Slug from string

export const slugify=(text:string)=>{
    return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

