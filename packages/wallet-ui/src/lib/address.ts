/** "0x7a3f9e21..." -> "0x 7a3f 9e21 ...": groups for reading; copying keeps the address whole. */
export function groups(address: string): string[] {
  const hex = address.slice(2);
  const out = ["0x"];
  for (let i = 0; i < hex.length; i += 4) out.push(hex.slice(i, i + 4));
  return out;
}
