// server.js
const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(express.json()); 

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('Resume Builder Backend is running!');
});

// Endpoint to generate and download resume
app.post('/generate-resume', async (req, res) => {
    const { name, email, intro } = req.body;

    if (!name || !email || !intro) {
        return res.status(400).send('Missing required data: name, email, and intro are needed.');
    }

    const outputDir = path.join(__dirname, 'output');
    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const resumeFileName = `resume_${Date.now()}`;
    const texFilePath = path.join(outputDir, `${resumeFileName}.tex`);
    const pdfFilePath = path.join(outputDir, `${resumeFileName}.pdf`);

    const latexContent = `
\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{geometry}
\\geometry{a4paper, margin=1in}

\\title{Resume for ${name}}
\\author{${name}}
\\date{July 2025}

\\begin{document}
\\maketitle

\\section*{Contact Information}
Email: ${email}

\\section*{About Me}
${intro}

\\end{document}
    `;

    try {
        // 1. Write the .tex file
        fs.writeFileSync(texFilePath, latexContent);
        console.log(`.tex file created at: ${texFilePath}`);

        // 2. Compile LaTeX to PDF
        // The -output-directory flag ensures all auxiliary files are in 'output'
        const compileCommand = `pdflatex -interaction=nonstopmode -output-directory=${outputDir} ${texFilePath}`;
        console.log(`Executing: ${compileCommand}`);

        // Execute pdflatex
        await new Promise((resolve, reject) => {
            exec(compileCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    console.error(`stdout: ${stdout}`);
                    console.error(`stderr: ${stderr}`);
                    return reject(new Error('LaTeX compilation failed. Check server logs for details.'));
                }
                console.log(`pdflatex stdout: ${stdout}`);
                console.error(`pdflatex stderr: ${stderr}`); // stderr often contains warnings
                resolve();
            });
        });

        if (!fs.existsSync(pdfFilePath)) {
            throw new Error('PDF file was not created by pdflatex.');
        }

        res.download(pdfFilePath, `resume_${name.replace(/\s+/g, '_')}.pdf`, (err) => {
            if (err) {
                console.error('Error sending PDF:', err);
                // Even if PDF send fails, try to clean up
            }
            // Clean up generated files
            fs.unlink(texFilePath, (err) => { if (err) console.error('Error deleting .tex:', err); });
            fs.readdirSync(outputDir).forEach(file => {
                if (file.startsWith(resumeFileName) && file !== `${resumeFileName}.pdf`) {
                    fs.unlink(path.join(outputDir, file), (err) => { if (err) console.error(`Error deleting aux file ${file}:`, err); });
                }
            });
        });

        // You might want to send the .tex file separately if the frontend requests it,
        // or package them in a zip. For simplicity, we're just sending the PDF directly.

    } catch (err) {
        console.error('Error during resume generation:', err);
        res.status(500).send(err.message || 'Failed to generate resume.');
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});