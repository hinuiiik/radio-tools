export default function Footer() {
    return (
        <footer className="bg-gray-900 text-white p-4 text-center mt-4">
            <p>
                &copy; {new Date().getFullYear()} | Site developed for W4VKU by{" "} {""}
                <a
                    href="https://www.vikramk.dev"
                    className="text-blue-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Vikram Krishnakumar
                </a>
                &nbsp;|&nbsp;
                <a
                    href="mailto:hello@vikramk.dev"
                    className="text-blue-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Broken?
                </a>
            </p>
        </footer>
    );
}
