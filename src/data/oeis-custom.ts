export const customSequences = {
  A394905: {
    name: 'Breakable numbers',
    'Formal Definition': {
      text: `
        The smallest number <em>k &gt; n</em> such that the binary Hamming distance between <em>n</em> and <em>k</em> is equal to the number of runs in the binary representation of <em>n</em>, and <em>k</em> has strictly more runs than <em>n</em>.
        <br><br>
        <center><strong>a(n) = min { k &gt; n : d<sub>H</sub>(n, k) = R(n) and R(k) &gt; R(n) }</strong></center>
        `,
      type: 'definition-box',
    },
    'Structural Analysis & Motivation': '<p>The designation <strong>"Breakable Numbers"</strong> stems from an intuition regarding the structural integrity of binary blocks. In computer science and combinatorics, a <em>run</em> defines a consecutive sequence of identical bits (either all <code>1</code>s or all <code>0</code>s).</p>',
    'Analytical Examples':
      '<ul>        <li><strong>For n = 1:</strong> Binary representation is <code>1</code>, which has exactly <code>R(1) = 1</code> run. We look for the smallest <code>k &gt; 1</code> such that changing 1 bit increases the run count.             <ul>                <li>Testing <code>k = 5</code> (binary <code>101</code>): The Hamming distance <code>d<sub>H</sub>(1, 5) = 1</code> (since <code>001</code> to <code>101</code> requires flipping only the most significant bit). The number of runs in <code>101</code> is 3. Since 3 &gt; 1, <strong>a(1) = 5</strong>.</li>            </ul>        </li>        <li><strong>For n = 2:</strong> Binary representation is <code>10</code>, which has <code>R(2) = 2</code> runs. We must flip exactly 2 bits to find a <code>k</code> with more than 2 runs.            <ul>                <li>Testing <code>k = 11</code> (binary <code>1011</code>): The Hamming distance <code>d<sub>H</sub>(2, 11) = 2</code> (from <code>0010</code> to <code>1011</code>). The number of runs in <code>1011</code> is 3. Since 3 &gt; 2, <strong>a(2) = 11</strong>.</li>            </ul>        </li>    </ul>',
  },
  A396597: {
    name: 'Planetary Numbers',
    'Formal Definition': {
      text: 'Numbers <em>m</em> with exactly two distinct prime factors <em>q</em> and <em>p</em> such that:<br><br><center><strong><em>m = q<sup>k</sup> · p<sup>j</sup></em></strong> &nbsp;where&nbsp; <strong><em>p &gt; q<sup>k</sup></em></strong> &nbsp;and&nbsp; <strong><em>k, j ≥ 1</em></strong></center>',
      type: 'definition-box',
    },
    'Structural Analysis & Motivation':
      '<p>The designation <strong>"Planetary Numbers"</strong> stems from a structural analogy based on the gravitational hierarchy of astronomical systems. In this framework, the prime factorization acts as a tiny celestial system:</p><ul><li><strong>The Stellar Core (The Central Mass):</strong> The dominant prime factor <code>p</code> represents a "heavy" central body.</li><li><strong>The Satellites (The Orbital Group):</strong> The smaller prime power <code>q<sup>k</sup></code> acts as a cluster of lesser satellites orbiting the massive center.</li></ul><p>The mathematical constraint <code>p &gt; q<sup>k</sup></code> requires that the central "star" must always strictly exceed the combined weight of its internal "satellites" power cluster, enforcing a strict structural hierarchy inside the number\'s multiplicative decomposition.</p>',
    'Density and Asymptotic Behavior': '<p>For a fixed exponent <code>k</code>, the density of numbers satisfying <code>p &gt; q<sup>k</sup></code> tends to decrease as <code>n</code> increases. This behavior occurs because the dominant prime <code>p</code> must grow exponentially with respect to the smaller satellite base power <code>q<sup>k</sup></code> to keep the system stable within the bounds.</p>',
    'Analytical Examples':
      '<ul><li><strong>6 is included:</strong> Factors are 2<sup>1</sup> and 3<sup>1</sup>. Here, <code>p=3</code>, <code>q=2</code>, <code>k=1</code>. Since 3 &gt; 2<sup>1</sup>, the system is valid.</li><li><strong>92 is included:</strong> Factors are 2<sup>2</sup> and 23<sup>1</sup>. Here, <code>p=23</code>, <code>q=2</code>, <code>k=2</code>. Since 23 &gt; 2<sup>2</sup> (23 &gt; 4), it is valid.</li><li><strong>90 is excluded:</strong> 90 = 2 · 3<sup>2</sup> · 5. It contains three distinct prime factors, violating the binary system rule.</li><li><strong>89 is excluded:</strong> 89 is a prime number, meaning it lacks a companion satellite system.</li><li><strong>80 is excluded:</strong> 80 = 2<sup>4</sup> · 5. Here, <code>p=5</code> and <code>q<sup>k</sup>=2<sup>4</sup>=16</code>. Since 5 &lt; 16, the satellite power overpowers the central prime.</li></ul>',
    'Cross-References': '<p>See also OEIS entries: <a href="https://oeis.org" target="_blank">A001358</a> (Semiprimes), <a href="https://oeis.org" target="_blank">A007774</a>.</p><footer>© 2026 Vincenzo Manto. Conceptualized in collaboration with James C. McMahon.</footer>',
  },
};
