// Generate Nerevarine mode of Smitonic (LLsLsLs)
rank2(sqrt(16/11), 6);

// The labels JKLMNOP are from the Sothic mode (LsLsLsL)
let code = charCodeAt('J');

// Remember that the unison is implicit,
// so labeling starts from the second scale degree.
i => i fromCharCode(code++);
