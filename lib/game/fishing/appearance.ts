const PALETTE = ["#3aa6d8", "#7bc67e", "#c48ad9", "#e07a5f", "#d4a017"];

export function optionTag(index: number): string {
  return String.fromCharCode(65 + index);
}

export function fishFill(index: number): string {
  return PALETTE[index % PALETTE.length];
}
