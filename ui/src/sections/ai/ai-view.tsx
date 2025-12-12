import { useState, useCallback, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Snackbar, Alert } from '@mui/material';
import { askQuestionApiAiAskPost } from 'src/client';
import { DashboardContent } from 'src/layouts/dashboard';
import StarIcon from '@mui/icons-material/Star';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AccountIcon } from 'src/layouts/components/account-icon';


export function AIView() {
    const [isLoading, setIsLoading] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [error, setError] = useState("");
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
    const listRef = useRef<HTMLDivElement | null>(null);

    const handleSubmit = useCallback(
        async (e?: React.FormEvent) => {
            if (e) e.preventDefault();
            if (!prompt.trim()) return;
            // add user message immediately
            const userMessage = { role: 'user' as const, content: prompt };
            setMessages((m) => [...m, userMessage]);
            setPrompt('');
            setIsLoading(true);

            try {
                const response = await askQuestionApiAiAskPost({ query: { question: userMessage.content } });
                const md = (response.data as { answer: string }).answer;
                const assistantMessage = { role: 'assistant' as const, content: md };
                setMessages((m) => [...m, assistantMessage]);
            } catch (err: any) {
                setError(err?.message || 'An error occurred while processing your request.');
            } finally {
                setIsLoading(false);
            }
        },
        [prompt]
    );


    const handleCloseError = () => {
        setError('');
    };

    const handleChangePrompt = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPrompt(e.target.value);
        if (error) setError('');
    };

    useEffect(() => {
        // scroll to bottom when messages update
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const renderChat = (
        <Paper elevation={1} sx={{ p: 2, display: 'flex', height: "100%", flexDirection: 'column', gap: 2 }}>
            <Box sx={{ height: "75vh", overflow: 'auto' }} ref={listRef}>
                <List>
                    <Box sx={{ mb: 1 }}>
                        <ListItem alignItems="flex-start">
                            <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'transparent' }}>
                                    <img height={'90%'} src='/assets/ai-logo.png' />
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={'Anakin AI'}
                                secondary={
                                    <Box sx={{ mt: 0.5 }}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{"Ciao, come posso aiutarti?"}</ReactMarkdown>
                                    </Box>
                                }
                            />
                        </ListItem>
                        <Divider component="li" />
                    </Box>
                    {messages.map((m, idx) => (
                        <Box key={idx} sx={{ mb: 1 }}>
                            <ListItem alignItems="flex-start">
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: m.role === 'user' ? 'primary.main' : 'transparent' }}>
                                        {m.role === 'user' ? <AccountIcon /> : <img height={'90%'} src='/assets/ai-logo.png' />}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={m.role === 'user' ? 'You' : 'Anakin AI'}
                                    secondary={
                                        m.role === 'assistant' ? (
                                            <Box sx={{ mt: 0.5 }}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                            </Box>
                                        ) : (
                                            <Typography component="span">{m.content}</Typography>
                                        )
                                    }
                                />
                            </ListItem>
                            <Divider component="li" />
                        </Box>
                    ))}

                    {isLoading && (
                        <Box sx={{ mb: 1 }}>
                            <ListItem alignItems="flex-start">
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: 'transparent' }}>
                                        <CircularProgress size={20} />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={'Anakin AI'}
                                    secondary={
                                        <Box sx={{ mt: 0.5 }}>
                                            <Skeleton variant="text" width="60%" />
                                            <Skeleton variant="text" width="40%" />
                                        </Box>
                                    }
                                />
                            </ListItem>
                            <Divider component="li" />
                        </Box>
                    )}
                </List>
            </Box>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                    fullWidth
                    name="prompt"
                    label="Ask a question"
                    value={prompt}
                    onChange={handleChangePrompt}
                    placeholder="Write down your questions..."
                    disabled={isLoading}
                    size="small"
                />
                <IconButton color="primary" type="submit" disabled={isLoading} aria-label="send">
                    {isLoading ? <CircularProgress size={20} /> : <SendIcon />}
                </IconButton>
            </Box>
        </Paper>
    );

    return (
        <DashboardContent>
            <Box sx={{ gap: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 5 }}>
                <Typography variant="h5">AI Chat</Typography>
            </Box>

            {renderChat}

            <Snackbar
                open={error !== ''}
                autoHideDuration={6000}
                onClose={handleCloseError}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseError} severity="error" variant="filled" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>
        </DashboardContent>
    );
}
