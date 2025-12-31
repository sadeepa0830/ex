<!-- Manage Exams -->
<div class="admin-card">
    <h3><i class="fas fa-calendar-alt"></i> Manage Exams & Countdown</h3>
    
    <div class="form-group">
        <label for="examName">Exam Name</label>
        <input type="text" id="examName" class="form-input" placeholder="e.g., 2026 A/L Examination">
    </div>
    
    <div class="form-group">
        <label for="batchType">Batch Type</label>
        <select id="batchType" class="form-input">
            <option value="al">Advanced Level (A/L)</option>
            <option value="ol">Ordinary Level (O/L)</option>
        </select>
    </div>
    
    <div class="form-group">
        <label for="batchYear">Batch Year</label>
        <input type="text" id="batchYear" class="form-input" placeholder="e.g., 2025, 2026, 2027">
    </div>
    
    <div class="form-group">
        <label for="examDate">Exam Date & Time</label>
        <input type="datetime-local" id="examDate" class="form-input">
    </div>
    
    <div class="form-group">
        <label for="examStatus">Status</label>
        <select id="examStatus" class="form-input">
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
        </select>
    </div>
    
    <button onclick="saveExam()" class="btn-primary">
        <i class="fas fa-plus"></i> Add/Update Exam
    </button>
    
    <div id="examList" style="margin-top: 1.5rem;"></div>
</div>
