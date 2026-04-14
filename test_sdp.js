const sdp = "v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 minptime=10;useinbandfec=1\r\n";
const ptMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
const pt = ptMatch[1];
const fmtpRegex = new RegExp(`a=fmtp:${pt}\\s+(.*?)(?:\\r?\\n|$)`);
const res = sdp.replace(fmtpRegex, (match, p1) => {
    let newParams = p1;
    if (!newParams.includes('stereo=1')) newParams += ';stereo=1';
    if (!newParams.includes('sprop-stereo=1')) newParams += ';sprop-stereo=1';
    if (!newParams.includes('maxaveragebitrate=')) newParams += ';maxaveragebitrate=510000'; // 510kbps Opus max
    if (!newParams.includes('useinbandfec=1')) newParams += ';useinbandfec=1';
    if (!newParams.includes('cbr=1')) newParams += ';cbr=1';
    return `a=fmtp:${pt} ${newParams}\r\n`;
});
console.log(res);
