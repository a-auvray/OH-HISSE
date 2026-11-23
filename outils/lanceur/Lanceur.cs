using System;
using System.Diagnostics;
using System.IO;

/// Petit lanceur : démarre lancer.bat dans cette fenêtre. Il le cherche d'abord à côté de lui,
/// puis dans le dossier du projet mémorisé à la construction : on peut donc le copier sur le Bureau.
/// Tout le travail (interface, migrations, sauvegarde, serveur) est dans lancer.bat.
static class Lanceur
{
    static string Trouver()
    {
        foreach (string dossier in new[] { AppDomain.CurrentDomain.BaseDirectory, RacineDuProjet.Chemin })
        {
            if (!string.IsNullOrEmpty(dossier) && File.Exists(Path.Combine(dossier, "lancer.bat")))
                return dossier;
        }
        return null;
    }

    static int Main()
    {
        Console.Title = "Oh Hisse !";
        string dossier = Trouver();

        if (dossier == null)
        {
            Console.Error.WriteLine("lancer.bat est introuvable. J'ai cherché ici :");
            Console.Error.WriteLine("  " + AppDomain.CurrentDomain.BaseDirectory);
            Console.Error.WriteLine("  " + RacineDuProjet.Chemin + "  (le dossier du projet, mémorisé à la construction)");
            Console.Error.WriteLine("Le projet a-t-il été déplacé ? Reconstruis ce programme depuis le nouveau dossier :");
            Console.Error.WriteLine("  powershell -ExecutionPolicy Bypass -File outils\\construire-exe.ps1");
            Console.Error.WriteLine("Appuie sur une touche pour fermer.");
            Console.ReadKey(true);
            return 1;
        }

        var info = new ProcessStartInfo("cmd.exe", "/c \"\"" + Path.Combine(dossier, "lancer.bat") + "\"\"")
        {
            WorkingDirectory = dossier,
            UseShellExecute = false,
        };
        using (Process p = Process.Start(info))
        {
            p.WaitForExit();
            return p.ExitCode;
        }
    }
}
