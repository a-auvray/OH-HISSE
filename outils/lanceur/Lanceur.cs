using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

/// Oh Hisse ! comme une application : pas de fenêtre noire, le serveur démarre en arrière-plan,
/// l'interface s'ouvre dans sa propre fenêtre (sans onglets ni barre d'adresse), et le serveur
/// s'arrête quand on la ferme. Tout le travail (interface, migrations, sauvegarde, serveur) est
/// dans lancer.bat, lancé ici en mode « /app ». Compilé avec le compilateur C# fourni par Windows.
static class Lanceur
{
    // Le port 8000, ou celui de la variable OH_HISSE_PORT (comme dans lancer.bat).
    static readonly string Port = Environment.GetEnvironmentVariable("OH_HISSE_PORT") ?? "8000";
    static readonly string Adresse = "http://localhost:" + Port;
    static readonly string AdresseTest = "http://127.0.0.1:" + Port;

    [STAThread]
    static int Main()
    {
        string dossier = Trouver();
        if (dossier == null)
        {
            Erreur("lancer.bat est introuvable.\n\nJ'ai cherché ici :\n" + AppDomain.CurrentDomain.BaseDirectory + "\n"
                + RacineDuProjet.Chemin + " (le dossier du projet, mémorisé à la construction)\n\n"
                + "Le projet a-t-il été déplacé ? Reconstruis ce programme depuis le nouveau dossier :\n"
                + "powershell -ExecutionPolicy Bypass -File outils\\construire-exe.ps1");
            return 1;
        }

        string journal = Path.Combine(dossier, "journal-lancement.txt");
        Process serveur = null;
        if (!Repond())
        {
            serveur = Demarrer(dossier, journal);
            DateTime limite = DateTime.Now.AddSeconds(240);
            while (!Repond())
            {
                if (serveur.HasExited)
                {
                    Erreur("Oh Hisse ! n'a pas pu démarrer.\n\n" + Fin(journal) + "\n\n(Détail : " + journal + ")");
                    return 1;
                }
                if (DateTime.Now > limite)
                {
                    Arreter(serveur);
                    Erreur("Oh Hisse ! met trop de temps à démarrer.\n\n" + Fin(journal) + "\n\n(Détail : " + journal + ")");
                    return 1;
                }
                Thread.Sleep(500);
            }
        }

        OuvrirFenetre();
        if (serveur != null) Arreter(serveur);
        return 0;
    }

    /// lancer.bat se trouve à côté du programme, ou dans le dossier du projet mémorisé à la construction.
    static string Trouver()
    {
        foreach (string dossier in new string[] { AppDomain.CurrentDomain.BaseDirectory, RacineDuProjet.Chemin })
        {
            if (!string.IsNullOrEmpty(dossier) && File.Exists(Path.Combine(dossier, "lancer.bat")))
                return dossier;
        }
        return null;
    }

    static bool Repond()
    {
        try
        {
            // 127.0.0.1 (le serveur n'écoute qu'en IPv4) et sans proxy : « localhost » et la détection
            // du proxy système font perdre plus d'une seconde, et le serveur semblerait ne jamais répondre.
            HttpWebRequest requete = (HttpWebRequest)WebRequest.Create(AdresseTest + "/api/docs");
            requete.Proxy = null;
            requete.Timeout = 3000;
            using (HttpWebResponse reponse = (HttpWebResponse)requete.GetResponse())
                return (int)reponse.StatusCode == 200;
        }
        catch (Exception)
        {
            return false;
        }
    }

    static Process Demarrer(string dossier, string journal)
    {
        ProcessStartInfo info = new ProcessStartInfo("cmd.exe",
            "/c \"\"" + Path.Combine(dossier, "lancer.bat") + "\" /app > \"" + journal + "\" 2>&1\"");
        info.WorkingDirectory = dossier;
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        return Process.Start(info);
    }

    /// Arrête le serveur et tout ce qu'il a lancé (uv, uvicorn).
    static void Arreter(Process serveur)
    {
        try
        {
            ProcessStartInfo info = new ProcessStartInfo("taskkill.exe", "/PID " + serveur.Id + " /T /F");
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            using (Process p = Process.Start(info)) p.WaitForExit(10000);
        }
        catch (Exception)
        {
            // Déjà arrêté.
        }
    }

    static string Fin(string journal)
    {
        try
        {
            using (FileStream f = new FileStream(journal, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            using (StreamReader lecteur = new StreamReader(f))
            {
                string[] lignes = lecteur.ReadToEnd().Replace("\r", "").Split('\n');
                int debut = Math.Max(0, lignes.Length - 14);
                return string.Join("\n", lignes, debut, lignes.Length - debut).Trim();
            }
        }
        catch (Exception)
        {
            return "(pas de détail disponible)";
        }
    }

    static void Erreur(string texte)
    {
        MessageBox.Show(texte, "Oh Hisse !", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }

    /// Ouvre l'interface dans une fenêtre d'application et attend qu'on la ferme.
    /// Un profil à part garantit que ce processus dure aussi longtemps que la fenêtre.
    static void OuvrirFenetre()
    {
        string navigateur = TrouverNavigateur();
        if (navigateur == null)
        {
            Process.Start(Adresse);
            MessageBox.Show("Oh Hisse ! tourne sur " + Adresse + ".\n\nClique sur OK pour l'arrêter quand tu as fini.",
                "Oh Hisse !", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        string profil = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OhHisse", "profil");
        ProcessStartInfo info = new ProcessStartInfo(navigateur,
            "--app=" + Adresse + " --user-data-dir=\"" + profil + "\" --window-size=1520,960 --no-first-run --no-default-browser-check");
        info.UseShellExecute = false;
        using (Process fenetre = Process.Start(info))
        {
            fenetre.WaitForExit();
        }
    }

    /// Un navigateur de la famille Chromium (seul à savoir ouvrir une fenêtre d'application) : celui par défaut
    /// s'il en est un, sinon le premier installé.
    static string TrouverNavigateur()
    {
        string pf = Environment.GetEnvironmentVariable("ProgramFiles");
        string pf86 = Environment.GetEnvironmentVariable("ProgramFiles(x86)");
        string local = Environment.GetEnvironmentVariable("LOCALAPPDATA");

        string[][] candidats = new string[][]
        {
            new string[] { "brave", Path.Combine(pf, @"BraveSoftware\Brave-Browser\Application\brave.exe"), Path.Combine(pf86, @"BraveSoftware\Brave-Browser\Application\brave.exe"), Path.Combine(local, @"BraveSoftware\Brave-Browser\Application\brave.exe") },
            new string[] { "chrome", Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"), Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"), Path.Combine(local, @"Google\Chrome\Application\chrome.exe") },
            new string[] { "edge", Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"), Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe") },
            new string[] { "opera", Path.Combine(local, @"Programs\Opera\opera.exe") },
        };

        string defaut = "";
        try
        {
            object valeur = Registry.GetValue(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice", "ProgId", "");
            if (valeur != null) defaut = valeur.ToString().ToLowerInvariant();
        }
        catch (Exception)
        {
            // Pas de navigateur par défaut lisible : on prend le premier installé.
        }

        string premier = null;
        foreach (string[] c in candidats)
        {
            for (int i = 1; i < c.Length; i++)
            {
                if (!File.Exists(c[i])) continue;
                bool estLeDefaut = defaut.Contains(c[0]) || (c[0] == "edge" && defaut.Contains("msedge"));
                if (estLeDefaut) return c[i];
                if (premier == null) premier = c[i];
                break;
            }
        }
        return premier;
    }
}
