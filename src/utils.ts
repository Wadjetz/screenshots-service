
export function fileName(url: string, resize: number) {
  let name = (url + resize).replace(new RegExp(`[",/;\[\*\.\:\|\=\?\%]`, "g"), "_").replace("\\", "_").replace("\]", "_");
  return name + ".jpeg";
}
