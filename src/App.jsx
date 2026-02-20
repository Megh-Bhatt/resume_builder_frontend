import React, { useState } from 'react';
import { Upload, FileText, Wand2, Download, Eye, Loader2 } from 'lucide-react';

function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedResume, setGeneratedResume] = useState(null);
  const [pdfBase64, setPdfBase64] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
    } else {
      alert('Please upload a PDF file');
    }
  };

  const handleGenerate = async () => {
    if (!resumeFile || !jobDescription.trim()) {
      alert('Please upload a resume and enter a job description');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('resume_file', resumeFile);
      formData.append('job_description', jobDescription);

      const response = await fetch('http://localhost:8000/api/generate-resume', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setGeneratedResume(data);
        // Compile LaTeX to PDF
        await compileToPDF(data.latex_code);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate resume');
    } finally {
      setLoading(false);
    }
  };

  const compileToPDF = async (latexCode) => {
    try {
      const formData = new FormData();
      formData.append('latex_code', latexCode);

      const response = await fetch('http://localhost:8000/api/compile-latex', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setPdfBase64(data.pdf_base64);
      } else {
        console.error('PDF compilation failed:', data.error);
      }
    } catch (error) {
      console.error('Error compiling PDF:', error);
    }
  };

  const handleDownload = () => {
    if (pdfBase64) {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${pdfBase64}`;
      link.download = 'tailored-resume.pdf';
      link.click();
    }
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Resume Generator
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Panel - Input */}
          <div className="space-y-6">
            {/* Resume Upload */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload Your Resume
              </h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="resume-upload"
                />
                <label htmlFor="resume-upload" className="cursor-pointer">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  {resumeFile ? (
                    <div>
                      <p className="text-sm font-medium text-gray-700">{resumeFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">Click to change file</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Drop your resume here or click to browse</p>
                      <p className="text-xs text-gray-500 mt-1">PDF format only</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Job Description */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Job Description
              </h2>
              
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !resumeFile || !jobDescription.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate Tailored Resume
                </>
              )}
            </button>
          </div>

          {/* Right Panel - Output */}
          <div className="space-y-6">
            {generatedResume ? (
              <>
                {/* Resume Preview/Download */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Generated Resume
                  </h2>
                  
                  {pdfBase64 && (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                        ✓ Resume generated successfully!
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handlePreview}
                          className="flex-1 bg-blue-100 text-blue-700 py-3 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye className="w-5 h-5" />
                          Preview
                        </button>
                        
                        <button
                          onClick={handleDownload}
                          className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Download className="w-5 h-5" />
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata Display */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 max-h-[600px] overflow-y-auto">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Resume Details
                  </h2>
                  
                  {generatedResume.metadata && (
                    <div className="space-y-4 text-sm">
                      {/* Contact Info */}
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-2">Contact Information</h3>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                          <p><span className="font-medium">Name:</span> {generatedResume.metadata.name}</p>
                          <p><span className="font-medium">Email:</span> {generatedResume.metadata.email}</p>
                          {generatedResume.metadata.phone && (
                            <p><span className="font-medium">Phone:</span> {generatedResume.metadata.phone}</p>
                          )}
                        </div>
                      </div>

                      {/* Generated Projects */}
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-2">
                          Generated Projects ({generatedResume.metadata.projects?.length || 0})
                        </h3>
                        <div className="space-y-2">
                          {generatedResume.metadata.projects?.map((project, idx) => (
                            <div key={idx} className="bg-blue-50 rounded-lg p-3">
                              <p className="font-medium text-blue-900">{project.name}</p>
                              <p className="text-xs text-blue-700 mt-1">
                                {project.technologies?.join(', ')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Generated Skills */}
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-2">Technical Skills</h3>
                        <div className="bg-purple-50 rounded-lg p-3">
                          {Object.entries(generatedResume.metadata.technical_skills || {}).map(([category, skills]) => (
                            <div key={category} className="mb-2 last:mb-0">
                              <span className="font-medium text-purple-900 capitalize">{category}:</span>
                              <span className="text-purple-700 ml-2">{Array.isArray(skills) ? skills.join(', ') : skills}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Wand2 className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No Resume Generated Yet
                </h3>
                <p className="text-sm text-gray-500">
                  Upload your resume and job description to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && pdfBase64 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Resume Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto" style={{ height: 'calc(90vh - 60px)' }}>
              <iframe
                src={`data:application/pdf;base64,${pdfBase64}`}
                className="w-full h-full border-0"
                title="Resume Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
