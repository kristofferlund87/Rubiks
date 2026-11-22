declare module 'cubejs' {
  export default class Cube {
    constructor();
    static fromString(s: string): Cube;
    static initSolver(): void;
    move(alg: string): Cube;
    asString(): string;
    isSolved(): boolean;
    solve(maxDepth?: number): string;
  }
}
