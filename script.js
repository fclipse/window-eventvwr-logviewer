document.getElementById('fileInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const content = e.target.result;
        parseLogFile(content);
    };

    reader.readAsText(file);
});

function parseLogFile(content) {
    const networkAddresses = new Map();
    const failedAccounts = new Map();

    const logEntries = content.split('정보');

    logEntries.forEach(entry => {
        // 정규식 수정: 날짜와 시간을 정확히 추출
        const dateMatch = entry.match(/(\d{4}-\d{2}-\d{2}) (오전|오후) (\d{2}:\d{2}:\d{2})/);
        let date = '';

        if (dateMatch) {
            const [, datePart, period, timePart] = dateMatch;
            const [year, month, day] = datePart.split('-');
            let [hours, minutes, seconds] = timePart.split(':');

            // 시간을 24시간 형식으로 변환
            hours = parseInt(hours);
            if (period === '오후' && hours !== 12) {
                hours += 12;
            } else if (period === '오전' && hours === 12) {
                hours = 0;
            }

            // 날짜 형식 조합
            date = `${year}-${month}-${day} ${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
        }

        const networkAddressMatch = entry.match(/원본 네트워크 주소:\s+(\S+)/);
        if (networkAddressMatch) {
            const address = networkAddressMatch[1];
            const currentData = networkAddresses.get(address) || { count: 0, lastDate: '' };
            currentData.count++;
            currentData.lastDate = date > currentData.lastDate ? date : currentData.lastDate;
            networkAddresses.set(address, currentData);
        }

        if (entry.includes('로그온을 실패한 계정:')) {
            const accountSection = entry.split('로그온을 실패한 계정:')[1];
            const accountMatch = accountSection.match(/계정 이름:\s+(\S+)/);
            if (accountMatch) {
                const account = accountMatch[1];
                const currentData = failedAccounts.get(account) || { count: 0, lastDate: '' };
                currentData.count++;
                currentData.lastDate = date > currentData.lastDate ? date : currentData.lastDate;
                failedAccounts.set(account, currentData);
            }
        }
    });

    displayResults(networkAddresses, failedAccounts);
}

function displayResults(networkAddresses, failedAccounts) {
    const networkList = document.getElementById('networkAddresses');
    const accountList = document.getElementById('failedAccounts');

    networkList.innerHTML = '';
    accountList.innerHTML = '';

    // 네트워크 주소 표시
    Array.from(networkAddresses.entries()).forEach(([address, data]) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${address} (시도 횟수: ${data.count}, 마지막 시도: ${data.lastDate || '없음'})</span>
            <button class="copy-btn" data-copy="${address}">복사</button>
        `;
        networkList.appendChild(li);
    });

    // 실패한 계정을 시도 횟수 내림차순으로 정렬
    const sortedAccounts = Array.from(failedAccounts.entries())
        .sort((a, b) => b[1].count - a[1].count);

    sortedAccounts.forEach(([account, data]) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${account} (시도 횟수: ${data.count}, 마지막 시도: ${data.lastDate || '없음'})</span>
            <button class="copy-btn" data-copy="${account}">복사</button>
        `;
        accountList.appendChild(li);
    });

    // 복사 버튼 이벤트 리스너 추가
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const textToCopy = this.getAttribute('data-copy');
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = this.textContent;
                this.textContent = '복사됨!';
                setTimeout(() => {
                    this.textContent = originalText;
                }, 2000);
            });
        });
    });
}